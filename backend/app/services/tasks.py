from app.core.celery_app import celery_app


@celery_app.task(name="extract_document_data")
def extract_document_data_task(document_id: int) -> None:
    """
    Celery task that processes one uploaded document: calls the Vision LLM,
    validates its response, and saves the extracted fields to PostgreSQL.

    This is currently a placeholder. The full implementation (Vision LLM
    call, Pydantic validation, saving ExtractedField rows, updating
    Document.status) is built on Day 3. For now, this lets us wire up
    and test the upload endpoint -> RabbitMQ -> worker pipeline end to end,
    before the AI logic exists.
    """
    print(f"[stub] Would process document_id={document_id} here on Day 3")