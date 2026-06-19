from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.document import Document, DocumentStatus
from app.models.extracted_field import ExtractedField
from app.services.vision_llm import VisionExtractionError, extract_document_data


@celery_app.task(name="extract_document_data")
def extract_document_data_task(document_id: int) -> None:
    """
    Celery task that processes one uploaded document: calls the Vision LLM,
    validates its response, and saves the extracted fields to PostgreSQL.

    This task creates its own database session rather than reusing the
    FastAPI request's session (get_db). That request session was already
    closed by the time this task runs -- this task runs in a completely
    separate process (the Celery worker), seconds, minutes, or hours later.
    """
    # Each task run gets a fresh session. We close it manually in `finally`
    # since this is a plain function, not a FastAPI route using the
    # generator-based get_db() dependency.
    db = SessionLocal()

    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if document is None:
            # Defensive check: should not happen in practice since the
            # upload endpoint creates the row before enqueueing this task,
            # but a missing row should never crash the worker process.
            return

        document.status = DocumentStatus.PROCESSING
        db.commit()

        try:
            result = extract_document_data(document.file_path)
        except VisionExtractionError as exc:
            document.status = DocumentStatus.FAILED
            document.error_message = str(exc)
            db.commit()
            return

        # Replace any existing extracted fields for this document (relevant
        # if a document is ever reprocessed) before inserting the new ones.
        db.query(ExtractedField).filter(
            ExtractedField.document_id == document.id
        ).delete()

        for item in result.fields:
            db.add(
                ExtractedField(
                    document_id=document.id,
                    field_name=item.field_name,
                    field_value=item.field_value,
                )
            )

        document.status = DocumentStatus.COMPLETED
        document.confidence_score = result.confidence_score
        document.error_message = None
        db.commit()

    finally:
        db.close()