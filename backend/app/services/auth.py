from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Turn a plain-text password into a bcrypt hash for storage.

    bcrypt automatically generates and embeds a random "salt" inside the
    output hash, so two users with the same password get different hashes
    in the database -- this is what stops attackers from using precomputed
    "rainbow tables" to crack many passwords at once.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check a login attempt's plain-text password against the stored hash.

    We never decrypt the hash (bcrypt is one-way by design). Instead we
    hash the attempt with the same salt embedded in the stored hash and
    compare the two hashes.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    """
    Create a signed JWT for a logged-in user.

    `subject` is the value that identifies the user inside the token --
    here we use the user's email. The token is signed with our secret key,
    so the server can later verify it was not tampered with, without
    needing to store sessions anywhere (this is what makes JWT "stateless").
    """
    expire_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_expire_minutes
    )
    payload = {"sub": subject, "exp": expire_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """
    Verify a JWT and return the subject (user email) it was issued for.

    Returns None if the token is invalid for any reason: bad signature
    (tampered or signed with a different secret), or expired (`exp` in
    the past) -- jose checks expiry automatically during decode.
    """
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload.get("sub")
    except JWTError:
        return None
