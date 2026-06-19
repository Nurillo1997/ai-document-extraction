from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentStatus
from app.schemas.extracted_field import ExtractedFieldResponse


class DocumentUploadResponse(BaseModel):
    """
    Shape of the response immediately after a file is uploaded, before
    processing has happened. The frontend's upload screen uses this to
    show the new row with status="pending" right away.
    """

    id: int
    original_filename: str
    status: DocumentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetailResponse(BaseModel):
    """
    Shape of the response for the "Natija" (result) screen: the full
    outcome of one document, including every extracted field.
    """

    id: int
    original_filename: str
    status: DocumentStatus
    error_message: str | None
    confidence_score: float | None
    created_at: datetime
    updated_at: datetime | None
    extracted_fields: list[ExtractedFieldResponse]

    model_config = {"from_attributes": True}


class DocumentListItem(BaseModel):
    """
    Shape of a single row in the "Tarix" (history) screen's table.
    Deliberately lighter than DocumentDetailResponse -- the history table
    does not need the full list of extracted fields, only a summary,
    so we avoid pulling and serializing that extra data for every row.
    """

    id: int
    original_filename: str
    status: DocumentStatus
    confidence_score: float | None
    created_at: datetime

    model_config = {"from_attributes": True}