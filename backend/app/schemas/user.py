from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    """
    Shape of the request body for POST /auth/signup.

    Using EmailStr instead of plain str means Pydantic rejects malformed
    emails (e.g. "not-an-email") before our code ever runs -- validation
    happens at the API boundary, not buried inside business logic.
    """

    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, value: str) -> str:
        # A minimal but real rule: bcrypt itself silently truncates inputs
        # longer than 72 bytes, so we also cap the upper end to avoid
        # a confusing mismatch between what the user typed and what got hashed.
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if len(value) > 72:
            raise ValueError("Password must be at most 72 characters long")
        return value


class UserLogin(BaseModel):
    """Shape of the request body for POST /auth/login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """
    Shape of user data we are willing to send back to the client.

    Notice hashed_password is NOT a field here. Even if a route handler
    accidentally tries to return the full User model, FastAPI uses this
    schema to filter the output -- the hash never leaves the server.
    """

    id: int
    email: EmailStr
    created_at: datetime

    # Allows Pydantic to read attributes directly off a SQLAlchemy model
    # instance (user.id, user.email, ...) instead of requiring a dict.
    model_config = {"from_attributes": True}


class Token(BaseModel):
    """Shape of the response returned after a successful login."""

    access_token: str
    token_type: str = "bearer"