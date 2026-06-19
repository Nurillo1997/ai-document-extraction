import enum

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class DocumentStatus(str, enum.Enum):
    """
    The lifecycle of a single uploaded document.

    pending     -> row created, waiting for a Celery worker to pick it up
    processing  -> a worker is currently calling the Vision LLM
    completed   -> extraction succeeded and passed Pydantic validation
    failed      -> extraction or validation failed; error_message explains why
    """

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base):
    """
    Represents one uploaded file and the outcome of its AI extraction.

    This is the central table of the app: the upload screen creates a row
    here, the Celery worker updates its status as it processes the file,
    and the result/history/stats screens all read from this table.
    """

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign key: links this document back to the user who uploaded it.
    # index=True speeds up the common query "give me all documents for user X".
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    original_filename = Column(String, nullable=False)

    # Where the uploaded file lives on disk (or on the Render persistent disk
    # in production). We store the path, not the file bytes, in PostgreSQL.
    file_path = Column(String, nullable=False)

    # Using a native PostgreSQL ENUM type (via SQLAlchemy's Enum) instead of
    # a plain string means the database itself rejects any value that is not
    # one of the four defined statuses — another database-level safety net.
    status = Column(
        Enum(DocumentStatus, name="document_status"),
        nullable=False,
        default=DocumentStatus.PENDING,
        index=True,
    )

    # Populated only when status == FAILED, so the history screen can show
    # *why* extraction failed (e.g. "Vision LLM returned invalid JSON").
    error_message = Column(String, nullable=True)

    # Populated only when status == COMPLETED. A single 0-100 score for the
    # whole document, as requested by the Vision LLM alongside the data.
    confidence_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="documents")

    # cascade="all, delete-orphan" means: if a Document row is deleted,
    # automatically delete its extracted_fields rows too. Without this,
    # deleting a document would leave orphaned rows pointing nowhere.
    extracted_fields = relationship(
        "ExtractedField", back_populates="document", cascade="all, delete-orphan"
    )