from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, documents

app = FastAPI(
    title="AI Document Extraction API",
    description="Upload invoices and receipts, extract structured data with a Vision LLM.",
    version="1.0.0",
)

# CORS (Cross-Origin Resource Sharing): by default, browsers block a React
# app running on one origin (e.g. http://localhost:5173) from calling an
# API on a different origin (e.g. http://localhost:8000). This middleware
# explicitly allows our frontend's origin(s) to call this API.
#
# allow_origins is intentionally a list we control, not "*" (allow
# everything) -- a wildcard would let any website's JavaScript call our
# API on behalf of a logged-in user, which is a real security risk once
# this API is handling authenticated requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite's default dev server port
        "http://localhost:3000",  # fallback, in case a different React setup is used
        "https://ai-document-extraction-frontend.onrender.com",  # production frontend (Render)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)


@app.get("/health")
def health_check() -> dict:
    """
    Simple endpoint with no dependencies, used by Render to confirm the
    service is alive, and by us to sanity-check a deployment quickly.
    """
    return {"status": "ok"}