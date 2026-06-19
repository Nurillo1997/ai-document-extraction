from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.services.auth import decode_access_token

# OAuth2PasswordBearer tells FastAPI to expect a token in the
# "Authorization: Bearer <token>" header, and also wires up the
# automatic "Authorize" button in the /docs Swagger UI.
# tokenUrl points to our login endpoint, used only for documentation.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency that protects an endpoint: it requires a valid JWT
    in the Authorization header, decodes it, and loads the matching User
    from the database.

    Any route that includes `current_user: User = Depends(get_current_user)`
    in its signature is automatically protected -- FastAPI runs this check
    before the route's own code ever executes.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    email = decode_access_token(token)
    if email is None:
        raise credentials_error

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_error

    return user