import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import * as documentsApi from "../api/documents";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState([]);

  // Load the 5 most recent documents once when the page mounts, so the
  // "so'nggi yuklanganlar" list isn't empty on a fresh page visit.
  useEffect(() => {
    loadRecentDocuments();
  }, []);

  // While any document in the list is still pending/processing, poll the
  // backend every 3 seconds. We stop polling automatically once nothing
  // is in flight anymore, so we are not hammering the API forever.
  useEffect(() => {
    const hasInFlightDocument = recentDocuments.some(
      (doc) => doc.status === "pending" || doc.status === "processing"
    );

    if (!hasInFlightDocument) return;

    const intervalId = setInterval(loadRecentDocuments, 3000);
    return () => clearInterval(intervalId);
  }, [recentDocuments]);

  async function loadRecentDocuments() {
    try {
      const documents = await documentsApi.listDocuments();
      setRecentDocuments(documents.slice(0, 5));
    } catch {
      // Silently ignore polling failures (e.g. a transient network blip) --
      // the next poll a few seconds later will likely succeed, and surfacing
      // a hard error for a background refresh would be more disruptive than
      // helpful here.
    }
  }

  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Faqat JPG, PNG yoki PDF formatlari qabul qilinadi";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "Fayl hajmi 10MB dan oshmasligi kerak";
    }
    return null;
  }

  async function handleFile(file) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsUploading(true);
    try {
      await documentsApi.uploadDocument(file);
      await loadRecentDocuments();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Yuklashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInputChange(event) {
    const file = event.target.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />

      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-5">
          <h1 className="text-lg font-medium text-[var(--color-text)]">
            Hujjat yuklash
          </h1>
          <p className="text-sm text-[var(--color-text-2)]">
            Invoys, kvitansiya yoki boshqa hujjatni yuboring
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          className={`mb-4 cursor-pointer rounded-xl border-[1.5px] border-dashed px-8 py-35 text-center transition-colors ${
            isDragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <p className="mb-1 font-medium text-[var(--color-text)]">
            {isUploading
              ? "Yuklanmoqda..."
              : "Faylni shu yerga tashlang yoki bosing"}
          </p>
          <p className="text-sm text-[var(--color-text-2)]">
            JPG, PNG yoki PDF, 10MB gacha
          </p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-[var(--color-danger-text)]">
            {error}
          </p>
        )}

        <p className="mb-3 text-xs font-medium tracking-wide text-[var(--color-text-2)]">
          SO'NGGI YUKLANGANLAR
        </p>

        <div className="space-y-2">
          {recentDocuments.length === 0 && (
            <p className="text-sm text-[var(--color-text-3)]">
              Hali hech narsa yuklanmagan
            </p>
          )}
          {recentDocuments.map((doc) => (
            <div
              key={doc.id}
              onClick={() =>
                doc.status === "completed" && navigate(`/documents/${doc.id}`)
              }
              className={`flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 ${
                doc.status === "completed" ? "cursor-pointer" : ""
              }`}
            >
              <span className="text-sm text-[var(--color-text)]">
                {doc.original_filename}
              </span>
              <StatusBadge status={doc.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}