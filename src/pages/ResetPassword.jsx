import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPassword({ email, resetId, onBack, onComplete }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function verifyCode(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("campus-pay-password-reset", {
          body: {
            action: "verify",
            resetId,
            code: code.trim()
          }
        });

      if (functionError) {
        throw functionError;
      }

      if (!data?.verified || !data?.resetToken) {
        throw new Error("Verification failed.");
      }

      setResetToken(data.resetToken);
      setVerified(true);
      setMessage("Code verified. Create your new password.");
    } catch (verificationError) {
      console.error("Password reset verification error:", verificationError);
      setError("Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function completeReset(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("campus-pay-password-reset", {
          body: {
            action: "complete",
            resetToken,
            password
          }
        });

      if (functionError) {
        throw functionError;
      }

      if (!data?.success) {
        throw new Error("Password reset failed.");
      }

      setMessage("Password changed successfully.");

      setTimeout(() => {
        if (typeof onComplete === "function") {
          onComplete();
        }
      }, 1000);
    } catch (resetError) {
      console.error("Password reset completion error:", resetError);
      setError("We could not change your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <h1>{verified ? "Create New Password" : "Verify Your Email"}</h1>
          <p>
            {verified
              ? "Choose a new password for your Campus Pay account."
              : `Enter the 6-digit code sent to ${email}.`}
          </p>
        </div>

        {!verified ? (
          <form onSubmit={verifyCode}>
            <label htmlFor="reset-code">Verification Code</label>

            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Enter 6-digit code"
              autoComplete="one-time-code"
              disabled={loading}
              required
            />

            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={completeReset}>
            <label htmlFor="new-password">New Password</label>

            <div className="password-field">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                disabled={loading}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label htmlFor="confirm-password">Confirm Password</label>

            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={loading}
              required
            />

            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Changing Password..." : "Change Password"}
            </button>
          </form>
        )}

        <button type="button" onClick={onBack} disabled={loading}>
          Back to Login
        </button>
      </div>
    </section>
  );
}
