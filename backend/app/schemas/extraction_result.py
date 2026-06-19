from pydantic import BaseModel, Field


class ExtractedFieldItem(BaseModel):
    """
    One key-value pair the Vision LLM found in the document,
    e.g. {"field_name": "vendor", "field_value": "Acme Supplies LLC"}.

    field_value is a plain string even for numbers and dates -- this
    mirrors the ExtractedField database model, which also stores
    everything as text (see app/models/extracted_field.py for why).
    """

    field_name: str
    field_value: str


class DocumentExtractionResult(BaseModel):
    """
    The complete shape we require the Vision LLM's response to match.

    This schema serves two purposes:
    1. We send its JSON schema to OpenAI so the model is constrained to
       respond in exactly this shape (the "structured output" feature).
    2. We use it again on our side to validate the model's response before
       trusting it -- if OpenAI ever returns something that does not fit
       (wrong types, missing fields), Pydantic raises a ValidationError
       here, and the Celery task catches it and marks the document "failed"
       instead of saving bad data.
    """

    fields: list[ExtractedFieldItem] = Field(
        description="Every key piece of information found in the document, "
        "such as vendor name, invoice number, date, and total amount."
    )

    confidence_score: float = Field(
        ge=0,
        le=100,
        description="Your overall confidence (0-100) that the extracted "
        "fields are accurate and complete.",
    )