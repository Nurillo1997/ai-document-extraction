import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

const linkBaseClasses =
  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";

export default function Navbar() {
  const { logout } = useAuth();

  function linkClasses({ isActive }) {
    return isActive
      ? `${linkBaseClasses} bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]`
      : `${linkBaseClasses} text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]`;
  }

  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
      <div className="flex flex-wrap gap-1.5">
        <NavLink to="/upload" className={linkClasses}>
          Yuklash
        </NavLink>
        <NavLink to="/history" className={linkClasses}>
          Tarix
        </NavLink>
        <NavLink to="/stats" className={linkClasses}>
          Statistika
        </NavLink>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={logout}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]"
        >
          Chiqish
        </button>
      </div>
    </div>
  );
}