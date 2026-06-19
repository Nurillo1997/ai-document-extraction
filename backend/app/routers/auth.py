from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    """
    Register a new user.

    We check for an existing email ourselves (rather than relying only on
    the database's unique constraint) so we can return a clear 400 error
    with a helpful message, instead of letting a raw database integrity
    error bubble up as an opaque 500.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    new_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # populates new_user.id and new_user.created_at from the DB

    return new_user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)) -> Token:
    """
    Authenticate a user and issue a JWT access token.

    We deliberately return the *same* error message whether the email
    does not exist or the password is wrong. Distinguishing between the
    two would let an attacker probe which emails are registered.
    """
    invalid_credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
    )

    user = db.query(User).filter(User.email == credentials.email).first()
    if user is None:
        raise invalid_credentials_error

    if not verify_password(credentials.password, user.hashed_password):
        raise invalid_credentials_error

    access_token = create_access_token(subject=user.email)
    return Token(access_token=access_token)