import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.document import Document, DocumentStatus
from app.models.extracted_field import ExtractedField
from app.models.user import User
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentListItem,
    DocumentUploadResponse,
)
from app.services.tasks import extract_document_data_task
from fastapi.responses import FileResponse

router = APIRouter(prefix="/documents", tags=["documents"])

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

    extract_document_data_task.delay(new_document.id)

    return new_document


@router.get("", response_model=list[DocumentListItem])
def list_documents(
    status_filter: DocumentStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Document]:
    """
    Power the "Tarix" (history) screen's table: every document belonging
    to the current user, newest first, optionally filtered by status.

    We only ever query documents for current_user.id -- never all users'
    documents. Without this filter, any logged-in user could see every
    other user's uploaded files just by calling this endpoint.
    """
    query = db.query(Document).filter(Document.user_id == current_user.id)

    if status_filter is not None:
        query = query.filter(Document.status == status_filter)

    return query.order_by(Document.created_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Document:
    """
    Power the "Natija" (result) screen: full detail for one document,
    including every extracted field.
    """
    document = (
        db.query(Document)
        .options(joinedload(Document.extracted_fields))
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    return document

@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """
    Serve the original uploaded file's bytes, so the "Natija" (result)
    screen can show the actual document image instead of a generic icon.

    We still check user_id ownership here, exactly like get_document --
    a raw file path is just as sensitive as the document's metadata, so
    skipping this check would let any logged-in user view any other
    user's uploaded document just by guessing IDs.
    """
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk"
        )

    return FileResponse(document.file_path)


@router.get("/stats/summary")
def get_stats_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Power the "Statistika" screen's metric cards and charts.

    All aggregation happens in the database via SQL (COUNT, AVG, GROUP BY)
    rather than loading every document row into Python and looping over
    it -- this stays fast even as the number of documents grows, and is
    exactly the kind of query the separate extracted_fields table (instead
    of one big JSON column) was designed to make easy.
    """
    base_query = db.query(Document).filter(Document.user_id == current_user.id)

    total_documents = base_query.count()

    completed_count = base_query.filter(
        Document.status == DocumentStatus.COMPLETED
    ).count()

    success_rate = (
        round((completed_count / total_documents) * 100, 1)
        if total_documents > 0
        else 0.0
    )

    avg_confidence = (
        db.query(func.avg(Document.confidence_score))
        .filter(
            Document.user_id == current_user.id,
            Document.status == DocumentStatus.COMPLETED,
        )
        .scalar()
    )

    status_breakdown = dict(
        db.query(Document.status, func.count(Document.id))
        .filter(Document.user_id == current_user.id)
        .group_by(Document.status)
        .all()
    )

    daily_counts = dict(
        db.query(func.date(Document.created_at), func.count(Document.id))
        .filter(Document.user_id == current_user.id)
        .group_by(func.date(Document.created_at))
        .order_by(func.date(Document.created_at))
        .all()
    )

    return {
        "total_documents": total_documents,
        "success_rate_percent": success_rate,
        "average_confidence": round(avg_confidence, 1) if avg_confidence else None,
        "status_breakdown": status_breakdown,
        "daily_upload_counts": {str(k): v for k, v in daily_counts.items()},
    }