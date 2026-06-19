from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables (.env file).

    Pydantic Settings automatically reads matching environment variable
    names (case-insensitive) and validates their types. If a required
    variable is missing, the app will fail to start immediately with a
    clear error, instead of failing later with a confusing runtime bug.
    """

    # PostgreSQL connection string, e.g.
    # postgresql://user:password@localhost:5432/documents_db
    database_url: str

    # Secret key used to sign JWT tokens. Must be a long random string in production.
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # token valid for 24 hours

    # RabbitMQ connection string for Celery, e.g.
    # amqp://user:password@localhost:5672/document_extraction_vhost
    celery_broker_url: str

    # OpenAI API key for the Vision LLM extraction step
    openai_api_key: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Single shared settings instance, imported everywhere else in the app
settings = Settings()