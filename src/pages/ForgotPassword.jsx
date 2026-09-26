import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`
      }
    );

    if (resetError) {
      setError("We could not process the password reset request.");
    } else {
      setMessage(
        "If an account exists with this email, a password recovery email has been sent."
      );
    }

    setLoading(false);
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <h1>Forgot Password?</h1>
          <p>Recover your Campus Pay account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="reset-email">Email Address</label>

          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your registered email"
            autoComplete="email"
            required
          />

          {error && <p className="form-error">{error}</p>}

          {message && <p className="form-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Recovery Email"}
          </button>
        </form>

        <button type="button" onClick={onBack}>
          Back to Login
        </button>
      </div>
    </section>
  );
}
