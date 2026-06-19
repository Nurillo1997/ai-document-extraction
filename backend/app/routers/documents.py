import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.schemas.document import DocumentUploadResponse
from app.services.tasks import extract_document_data_task

router = APIRouter(prefix="/documents", tags=["documents"])

# Where uploaded files are stored on disk. In production this path points
# to a Render persistent disk (configured later), so files survive
# deployments and restarts -- a plain container filesystem does not.
UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB, matches the upload screen's copy


@router.post(
    "",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Document:
    """
    Accept an uploaded file, store it, create a `pending` Document row,
    and enqueue a Celery task to process it asynchronously.

    This endpoint intentionally does NOT call the Vision LLM itself.
    Returning immediately after enqueueing keeps the upload request fast
    (no waiting on a slow external API call) and lets the frontend show
    the document as "pending" right away, matching the upload screen design.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a JPG, PNG, or PDF.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum size is 10MB.",
        )

    # Generate a random, unique filename on disk. We never trust or reuse
    # the client-provided filename directly as a path: a malicious filename
    # like "../../etc/passwd" could otherwise be used to write outside the
    # intended upload directory (a "path traversal" attack).
    file_extension = os.path.splitext(file.filename or "")[1]
    stored_filename = f"{uuid.uuid4().hex}{file_extension}"
    stored_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    new_document = Document(
        user_id=current_user.id,
        original_filename=file.filename or stored_filename,
        file_path=stored_path,
        status=DocumentStatus.PENDING,
    )
    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    # .delay() sends this task to RabbitMQ and returns immediately --
    # it does NOT run the task here in the web process. A separate Celery
    # worker process (started independently) picks it up from the queue.
    extract_document_data_task.delay(new_document.id)

    return new_document