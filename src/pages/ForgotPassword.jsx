import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ForgotPassword({ onBack, onCodeSent }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("campus-pay-password-reset", {
          body: {
            action: "request",
            email: normalizedEmail
          }
        });

      if (functionError) {
        throw functionError;
      }

      if (!data?.resetId) {
        throw new Error("Password reset request could not be started.");
      }

      setMessage(
        "If an account exists with this email, a verification code has been sent."
      );

      if (typeof onCodeSent === "function") {
        onCodeSent({
          email: normalizedEmail,
          resetId: data.resetId
        });
      }
    } catch (requestError) {
      console.error("Password reset request error:", requestError);

      setError(
        "We could not process the password reset request right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
            required
          />

          {error && <p className="form-error">{error}</p>}

          {message && <p className="form-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>

        <button type="button" onClick={onBack} disabled={loading}>
          Back to Login
        </button>
      </div>
    </section>
  );
}
