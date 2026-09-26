import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onForgotPassword, onSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (loginError) {
      setError("Incorrect email or password.");
    }

    setLoading(false);
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <h1>Campus Pay</h1>
          <p>Secure student payment assistance</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
          />

          <label htmlFor="login-password">Password</label>

          <div className="password-field">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <button type="button" onClick={onForgotPassword}>
          Forgot Password?
        </button>

        <p>
          Don't have an account?{" "}
          <button type="button" onClick={onSignup}>
            Create Account
          </button>
        </p>
      </div>
    </section>
  );
}
