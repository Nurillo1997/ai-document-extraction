from pydantic import BaseModel


class ExtractedFieldResponse(BaseModel):
    """
    Shape of a single extracted key-value pair when returned to the client,
    e.g. {"field_name": "vendor", "field_value": "Acme Supplies LLC"}.
    """

    field_name: str
    field_value: str | None

    model_config = {"from_attributes": True}