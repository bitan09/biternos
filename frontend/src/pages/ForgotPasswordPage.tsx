import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthApi } from "../api/endpoints";
import { Logo } from "../components/Logo";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await AuthApi.forgotPassword(email);
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <Logo size={40} />
        </div>
        <h1>Reset your password</h1>
        <p className="auth-card__subtitle">We'll email you a link to set a new one</p>

        {sent ? (
          <div className="card" style={{ background: "var(--green-bg)", border: "1px solid rgba(67,209,122,0.3)" }}>
            <p style={{ fontSize: 14, color: "var(--text-primary)", margin: 0 }}>
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
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
