from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# The "engine" manages the actual connection pool to PostgreSQL.
# pool_pre_ping=True checks that a connection is still alive before using it,
# which prevents errors after the DB has been idle (common on free-tier hosts
# that close idle connections).
engine = create_engine(settings.database_url, pool_pre_ping=True)

# SessionLocal is a factory: every request will create its own Session
# instance from this factory. We never share one Session across requests.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the parent class every SQLAlchemy model inherits from.
# It is what lets SQLAlchemy know "this Python class maps to a database table".
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session per request.

    Using `yield` here makes this a generator-based dependency: FastAPI
    runs the code before `yield` to set up the session, hands it to the
    route, and after the route finishes (success or error) the code after
    `yield` runs to close the session. This guarantees we never leak
    open connections.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()