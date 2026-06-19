const STATUS_STYLES = {
  completed: "bg-[var(--color-success-soft)] text-[var(--color-success-text)]",
  processing: "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]",
  failed: "bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]",
  pending: "bg-[var(--color-surface-2)] text-[var(--color-text-2)]",
};

export default function StatusBadge({ status }) {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <span
      className={`inline-block rounded-md px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}