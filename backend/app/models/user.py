from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    """
    Represents a registered user of the application.

    Each user can upload many documents (one-to-many relationship with
    the Document model). We never store the raw password — only its
    bcrypt hash, computed in app/services/auth.py before saving.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # unique=True creates a database-level constraint: PostgreSQL itself
    # will reject a duplicate email, even if our application code has a bug.
    email = Column(String, unique=True, index=True, nullable=False)

    hashed_password = Column(String, nullable=False)

    # server_default=func.now() means PostgreSQL itself sets this timestamp
    # when the row is inserted, rather than relying on Python's clock.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # This does not create a database column. It lets us write
    # `some_user.documents` in Python to get all documents that belong
    # to this user, via the foreign key defined on the Document model.
    documents = relationship("Document", back_populates="owner")
    