import apiClient from "./client";

/**
 * Fetches a document's original file as a blob and returns a temporary
 * local URL for it (e.g. "blob:http://localhost:5173/abc-123").
 *
 * We can't just use <img src="http://.../documents/5/file"> directly:
 * a plain <img> tag has no way to attach our JWT Authorization header,
 * and that endpoint requires one (get_current_user dependency). Fetching
 * the bytes through apiClient first (which *does* attach the header via
 * its interceptor) and turning them into a local blob URL is the
 * standard workaround for showing protected images in the browser.
 *
 * Callers must revoke the returned URL (URL.revokeObjectURL) when done,
 * to avoid leaking memory -- see ResultPage.jsx's cleanup effect.
 */
export async function fetchDocumentFileUrl(documentId) {
  const response = await apiClient.get(`/documents/${documentId}/file`, {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
}

/**
 * Calls POST /documents with multipart/form-data. The browser's FormData
 * API handles the multipart encoding -- we just need to attach the raw
 * File object under the key "file", matching the backend's
 * `file: UploadFile` parameter name.
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/**
 * Calls GET /documents, optionally filtered by status.
 * statusFilter is one of "pending" | "processing" | "completed" | "failed",
 * or undefined/null to fetch all of the current user's documents.
 */
export async function listDocuments(statusFilter) {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await apiClient.get("/documents", { params });
  return response.data;
}

/** Calls GET /documents/{id} for the full result detail screen. */
export async function getDocument(documentId) {
  const response = await apiClient.get(`/documents/${documentId}`);
  return response.data;
}

/** Calls GET /documents/stats/summary for the stats screen's metrics and charts. */
export async function getStatsSummary() {
  const response = await apiClient.get("/documents/stats/summary");
  return response.data;
}