import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import * as documentsApi from "../api/documents";

// Builds the SVG stroke-dasharray math for a circular progress ring.
// The circle's circumference is 2 * PI * radius; we show `percent` of
// it as the colored arc and leave the rest as the track underneath.
function describeConfidenceRing(percent) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;
  return { circumference, filled };
}

export default function ResultPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let createdBlobUrl = null;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const data = await documentsApi.getDocument(documentId);
        if (isCancelled) return;
        setDocument(data);

        // Fetch the actual file image separately, after we know the
        // document exists. A failure here (e.g. file missing on disk)
        // should not block showing the rest of the document's data.
        try {
          createdBlobUrl = await documentsApi.fetchDocumentFileUrl(documentId);
          if (!isCancelled) setFileUrl(createdBlobUrl);
        } catch {
          // Leave fileUrl null; the fallback icon below covers this case.
        }
      } catch {
        if (!isCancelled) setError("Hujjat topilmadi");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
      // Release the blob URL's memory once this page is left or the
      // documentId changes -- otherwise each visited document leaks
      // a small chunk of browser memory that never gets freed.
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [documentId]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-medium text-[var(--color-text)]">
            Natija
          </h1>
          <button
            onClick={() => navigate("/upload")}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-2)]"
          >
            ← Orqaga
          </button>
        </div>

        {isLoading && (
          <p className="text-sm text-[var(--color-text-2)]">Yuklanmoqda...</p>
        )}

        {error && (
          <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
        )}

        {document && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              {fileUrl ? (
                <img
                  src={fileUrl}
                  alt={document.original_filename}
                  className="max-h-[320px] w-full rounded-lg object-contain"
                />
              ) : (
                <>
                  <span className="text-4xl">📄</span>
                  <p className="mt-3 text-sm text-[var(--color-text-2)]">
                    {document.original_filename}
                  </p>
                </>
              )}
            </div>

            <div>
              {document.status === "completed" && (
                <ConfidenceCard document={document} />
              )}

              {document.status === "failed" && (
                <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="mb-2">
                    <StatusBadge status="failed" />
                  </div>
                  <p className="text-sm text-[var(--color-text-2)]">
                    {document.error_message ||
                      "Hujjatni qayta ishlashda xatolik yuz berdi"}
                  </p>
                </div>
              )}

              {(document.status === "pending" ||
                document.status === "processing") && (
                <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <StatusBadge status={document.status} />
                  <p className="mt-2 text-sm text-[var(--color-text-2)]">
                    Hujjat hali qayta ishlanmoqda
                  </p>
                </div>
              )}

              {document.extracted_fields?.length > 0 && (
                <div className="space-y-1.5">
                  {document.extracted_fields.map((field) => (
                    <div
                      key={field.field_name}
                      className="flex justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
                    >
                      <span className="text-sm text-[var(--color-text-2)]">
                        {field.field_name}
                      </span>
                      <span className="max-w-[60%] text-right text-sm font-medium text-[var(--color-text)]">
                        {field.field_value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceCard({ document }) {
  const { circumference, filled } = describeConfidenceRing(
    document.confidence_score
  );

  return (
    <div className="mb-4 flex items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth="5"
        />
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          transform="rotate(-90 26 26)"
        />
        <text
          x="26"
          y="30"
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          fill="var(--color-text)"
        >
          {Math.round(document.confidence_score)}%
        </text>
      </svg>
      <div>
        <p className="mb-1 text-sm font-medium text-[var(--color-text)]">
          Ishonchlilik darajasi
        </p>
        <StatusBadge status="completed" />
      </div>
    </div>
  );
}