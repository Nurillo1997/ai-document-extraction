import base64
import mimetypes

from openai import OpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.extraction_result import DocumentExtractionResult

client = OpenAI(api_key=settings.openai_api_key)

EXTRACTION_PROMPT = """\
You are a document data extraction assistant. Look at the attached image
of an invoice, receipt, or similar business document and extract every
meaningful field you can find (for example: vendor name, invoice number,
date, line items, subtotal, tax, total amount, currency).

Use clear, consistent field names in snake_case (e.g. "vendor",
"invoice_number", "total_amount", "date"). If a field is not present in
the document, simply omit it rather than guessing a value.

Also provide an overall confidence score from 0 to 100 reflecting how
certain you are that the extracted fields are accurate and complete.
"""


class VisionExtractionError(Exception):
    """
    Raised when the Vision LLM call fails outright, or when its response
    does not match our required schema. The Celery task catches this
    specifically to set the document's status to "failed" with a clear
    error_message, instead of letting a generic exception crash the worker.
    """


def _encode_image_as_data_url(file_path: str) -> str:
    """
    Read an image file from disk and turn it into a base64 data URL,
    the format OpenAI's vision input expects (e.g. for sending images that
    are not hosted at a public URL).
    """
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = "image/jpeg"  # reasonable default for our allowed upload types

    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")

    return f"data:{mime_type};base64,{encoded}"


def extract_document_data(image_data_url: str) -> DocumentExtractionResult:
    """
    Send a document image to the Vision LLM and return validated,
    structured data.

    Takes an already-encoded base64 data URL rather than a file path: the
    caller (the upload endpoint) reads the file from its own local disk and
    encodes it before enqueueing the Celery task. The Celery worker runs in
    a completely separate container -- in production, on a separate machine
    from the API -- with no access to that disk, so passing a file path
    here would fail with FileNotFoundError.

    The OCR-free approach: instead of running a separate text-extraction
    step and then parsing the text, we send the raw image directly to a
    model that can both "read" the image and reason about its structure
    in a single call.
    """
    try:
        response = client.responses.parse(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": EXTRACTION_PROMPT},
                        {"type": "input_image", "image_url": image_data_url},
                    ],
                }
            ],
            text_format=DocumentExtractionResult,
        )
    except Exception as exc:
        # Covers network errors, OpenAI API errors (rate limits, invalid
        # key, etc), and anything else from the SDK call itself.
        raise VisionExtractionError(f"Vision LLM request failed: {exc}") from exc

    parsed = response.output_parsed
    if parsed is None:
        # The SDK could not even parse a structured result -- this is the
        # case the brief calls out explicitly: "validatsiya qilinadi
        # (muvaffaqiyatsiz bo'lsa xatolik holati)".
        raise VisionExtractionError(
            "Vision LLM did not return a parseable structured response"
        )

    try:
        # Re-validate explicitly with our own schema. response.output_parsed
        # is already a DocumentExtractionResult instance here, but this
        # makes the validation step visible and explicit in our own code,
        # rather than silently trusting the SDK's internal parsing.
        return DocumentExtractionResult.model_validate(parsed.model_dump())
    except ValidationError as exc:
        raise VisionExtractionError(f"Vision LLM response failed validation: {exc}") from exc