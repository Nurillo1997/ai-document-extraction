import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import Navbar from "../components/Navbar";
import * as documentsApi from "../api/documents";

// Chart.js requires each chart type's building blocks to be registered
// once, globally, before any <Bar> or <Doughnut> renders -- otherwise it
// throws a runtime error like "arc is not a registered element".
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const STATUS_COLORS = {
  completed: "#1D9E75",
  processing: "#5B5FEF",
  pending: "#9C9892",
  failed: "#D64545",
};

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await documentsApi.getStatsSummary();
        setStats(data);
      } catch {
        setError("Statistikani yuklab bo'lmadi");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar />
        <p className="px-5 py-8 text-sm text-[var(--color-text-2)]">
          Yuklanmoqda...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar />
        <p className="px-5 py-8 text-sm text-[var(--color-danger-text)]">
          {error}
        </p>
      </div>
    );
  }

  const dailyLabels = Object.keys(stats.daily_upload_counts);
  const dailyValues = Object.values(stats.daily_upload_counts);

  const statusLabels = Object.keys(stats.status_breakdown);
  const statusValues = Object.values(stats.status_breakdown);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="mb-5 text-lg font-medium text-[var(--color-text)]">
          Statistika
        </h1>

        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MetricCard label="Jami hujjat" value={stats.total_documents} />
          <MetricCard
            label="Muvaffaqiyat"
            value={`${stats.success_rate_percent}%`}
          />
          <MetricCard
            label="O'rtacha ishonch"
            value={
              stats.average_confidence != null
                ? `${Math.round(stats.average_confidence)}%`
                : "—"
            }
          />
          <MetricCard label="Hujjat turlari" value={statusLabels.length} />
        </div>

        <p className="mb-2.5 text-sm font-medium text-[var(--color-text-2)]">
          Kunlik yuklamalar
        </p>
        <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
          {dailyLabels.length === 0 ? (
            <p className="text-sm text-[var(--color-text-3)]">
              Hali ma'lumot yo'q
            </p>
          ) : (
            <Bar
              data={{
                labels: dailyLabels,
                datasets: [
                  {
                    data: dailyValues,
                    backgroundColor: "#5B5FEF",
                    borderRadius: 5,
                    maxBarThickness: 32,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          )}
        </div>

        <p className="mb-2.5 text-sm font-medium text-[var(--color-text-2)]">
          Holat bo'yicha taqsimot
        </p>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
          {statusLabels.length === 0 ? (
            <p className="text-sm text-[var(--color-text-3)]">
              Hali ma'lumot yo'q
            </p>
          ) : (
            <div className="mx-auto max-w-xs">
              <Doughnut
                data={{
                  labels: statusLabels,
                  datasets: [
                    {
                      data: statusValues,
                      backgroundColor: statusLabels.map(
                        (label) => STATUS_COLORS[label] || "#9C9892"
                      ),
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { position: "right" } },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <p className="mb-1.5 text-xs text-[var(--color-text-2)]">{label}</p>
      <p className="text-xl font-medium text-[var(--color-text)]">{value}</p>
    </div>
  );
}