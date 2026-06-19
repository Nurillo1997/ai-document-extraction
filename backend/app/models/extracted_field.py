from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ExtractedField(Base):
    """
    Represents a single key-value pair extracted from a document by the
    Vision LLM (e.g. field_name="vendor", field_value="Acme Supplies LLC").

    Storing each field as its own row, instead of one big JSON column on
    Document, makes it cheap to run aggregate queries for the stats screen,
    e.g. "which field names appear most often" or "average confidence per
    field type" -- queries that would require unpacking JSON otherwise.
    """

    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(
        Integer, ForeignKey("documents.id"), nullable=False, index=True
    )

    # e.g. "vendor", "invoice_number", "total_amount", "date"
    field_name = Column(String, nullable=False)

    # Stored as text regardless of the field's real type (date, number, etc).
    # Keeping this schema-flexible matters because different document types
    # (invoice vs receipt vs contract) extract different sets of fields --
    # we are not forcing every document into one fixed set of typed columns.
    field_value = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="extracted_fields")
