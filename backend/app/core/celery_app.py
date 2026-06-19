from celery import Celery

from app.core.config import settings

# We give this Celery app its own dedicated queue name,
# "document_extraction_tasks", instead of using Celery's default "celery"
# queue. This matters because the RabbitMQ instance is shared with other
# projects (image-task-queue from project 2) -- using a distinct queue name
# keeps this project's tasks completely separate from the other project's
# tasks on the same broker, even though they share the same RabbitMQ server.
celery_app = Celery(
    "document_extraction",
    broker=settings.celery_broker_url,
    # We are not using Celery's result backend (e.g. storing task results in
    # Redis) because we already persist every result ourselves in PostgreSQL
    # (the documents and extracted_fields tables). Adding a second place to
    # store results would be redundant and another thing that can go out of
    # sync with the database.
    backend=None,
)

celery_app.conf.update(
    task_default_queue="document_extraction_tasks",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

# Tell Celery which module(s) contain @celery_app.task-decorated functions.
# We will create app/services/tasks.py in the next step.
celery_app.autodiscover_tasks(["app.services"])