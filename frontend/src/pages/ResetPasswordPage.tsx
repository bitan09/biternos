import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthApi } from "../api/endpoints";
import { Logo } from "../components/Logo";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await AuthApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "That reset link is invalid or has expired");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <Logo size={40} />
        </div>
        <h1>Set a new password</h1>

        {done ? (
          <p className="text-muted" style={{ textAlign: "center" }}>Password updated. Redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}
            {!token && <div className="form-error">Missing reset token — use the link from your email.</div>}

            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={submitting || !token}>
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
