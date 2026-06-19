import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // login() here is AuthContext's wrapper, not api/auth.js's directly --
      // it both stores the token AND updates isAuthenticated, so the rest
      // of the app (e.g. ProtectedRoute) immediately knows we're logged in.
      await login(email, password);
      navigate("/upload");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Email yoki parol noto'g'ri");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]">
            <span className="text-lg text-white">📄</span>
          </div>
          <h1 className="text-lg font-medium text-[var(--color-text)]">
            Kirish
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-2)]">
            Hisobingizga xush kelibsiz
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-2)]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-2)]">
              Parol
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="parolingiz"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-text-2)]">
          Hisobingiz yo'qmi?{" "}
          <Link to="/signup" className="font-medium text-[var(--color-accent)]">
            Ro'yxatdan o'tish
          </Link>
        </p>
      </div>
    </div>
  );
}