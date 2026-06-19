import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import * as documentsApi from "../api/documents";

const STATUS_OPTIONS = [
  { value: "", label: "Barcha holatlar" },
  { value: "completed", label: "completed" },
  { value: "processing", label: "processing" },
  { value: "pending", label: "pending" },
  { value: "failed", label: "failed" },
];

export default function HistoryPage() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Re-fetch from the backend whenever the status filter changes -- the
  // backend already supports a ?status= query param (see GET /documents
  // in documents.py), so filtering happens server-side rather than us
  // loading every document and filtering in the browser.
  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  async function loadDocuments() {
    setIsLoading(true);
    setError("");
    try {
      const data = await documentsApi.listDocuments(statusFilter || undefined);
      setDocuments(data);
    } catch {
      setError("Hujjatlar ro'yxatini yuklab bo'lmadi");
    } finally {
      setIsLoading(false);
    }
  }

  // The filename search, unlike the status filter, happens client-side --
  // the backend has no search endpoint, and filtering an already-small,
  // already-loaded list in the browser is simpler than adding one.
  const visibleDocuments = documents.filter((doc) =>
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleRowClick(doc) {
    if (doc.status === "completed" || doc.status === "failed") {
      navigate(`/documents/${doc.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-medium text-[var(--color-text)]">
            Hujjatlar tarixi
          </h1>
          <button
            onClick={() => navigate("/upload")}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-2)]"
          >
            + Yangi yuklash
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Fayl nomi bo'yicha qidirish"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        {isLoading && (
          <p className="text-sm text-[var(--color-text-2)]">Yuklanmoqda...</p>
        )}
        {error && (
          <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
        )}

        {!isLoading && !error && (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-left text-xs text-[var(--color-text-2)]">
                  <th className="px-3.5 py-2.5 font-medium">Fayl</th>
                  <th className="px-3.5 py-2.5 font-medium">Sana</th>
                  <th className="px-3.5 py-2.5 font-medium">Holat</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">
                    Ishonch
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDocuments.map((doc) => {
                  const isClickable =
                    doc.status === "completed" || doc.status === "failed";
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleRowClick(doc)}
                      className={`border-t border-[var(--color-border)] bg-[var(--color-surface)] ${
                        isClickable ? "cursor-pointer" : ""
                      }`}
                    >
                      <td className="px-3.5 py-2.5 text-[var(--color-text)]">
                        {doc.original_filename}
                      </td>
                      <td className="px-3.5 py-2.5 text-[var(--color-text-2)]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-[var(--color-text)]">
                        {doc.confidence_score != null
                          ? `${Math.round(doc.confidence_score)}%`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visibleDocuments.length === 0 && (
              <p className="px-3.5 py-4 text-sm text-[var(--color-text-3)]">
                Hech narsa topilmadi
              </p>
            )}
          </div>
        )}

        <p className="mt-2.5 text-xs text-[var(--color-text-3)]">
          Failed qatorni bosish xatolik sababini ko'rsatadi
        </p>
      </div>
    </div>
  );
}