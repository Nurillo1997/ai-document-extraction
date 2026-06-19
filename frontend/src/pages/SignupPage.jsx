import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as authApi from "../api/auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    // Client-side check before even calling the API: catching this here
    // gives instant feedback, instead of waiting for a round trip to the
    // server just to find out the two fields don't match.
    if (password !== confirmPassword) {
      setError("Parollar bir xil emas");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.signup(email, password);
      // After a successful signup, send the user to login rather than
      // logging them in automatically -- this matches the prototype's
      // flow (signup -> login) and keeps the signup endpoint simple
      // (it only creates the account, it does not also issue a token).
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Ro'yxatdan o'tishda xatolik yuz berdi");
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
            Ro'yxatdan o'tish
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-2)]">
            Hujjatlardan AI yordamida ma'lumot ajratish
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="kamida 8 belgi"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-2)]">
              Parolni tasdiqlash
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="qayta kiriting"
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
            {isSubmitting ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-text-2)]">
          Hisobingiz bormi?{" "}
          <Link to="/login" className="font-medium text-[var(--color-accent)]">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}