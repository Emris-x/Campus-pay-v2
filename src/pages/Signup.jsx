import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Signup({ onLogin }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    matricNumber: "",
    registrationNumber: "",
    faculty: "",
    department: "",
    agentCode: "",
    password: "",
    confirmPassword: ""
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!acceptedTerms) {
      setError("You must agree to the Campus Pay terms and conditions.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          matriculation_number: form.matricNumber.trim(),
          registration_number: form.registrationNumber.trim(),
          faculty: form.faculty.trim(),
          department: form.department.trim(),
          agent_code: form.agentCode.trim() || null
        }
      }
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setMessage(
        data.session
          ? "Account created successfully."
          : "Account created. Please check your email to verify your account."
      );
    }

    setLoading(false);
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <h1>Campus Pay</h1>
          <p>Create your student account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={updateField}
            placeholder="Enter your full name"
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={updateField}
            placeholder="Enter your phone number"
            required
          />

          <label htmlFor="matricNumber">Matriculation Number</label>
          <input
            id="matricNumber"
            name="matricNumber"
            value={form.matricNumber}
            onChange={updateField}
            placeholder="Enter your matriculation number"
            required
          />

          <label htmlFor="registrationNumber">Registration Number</label>
          <input
            id="registrationNumber"
            name="registrationNumber"
            value={form.registrationNumber}
            onChange={updateField}
            placeholder="Enter your registration number"
            required
          />

          <label htmlFor="faculty">Faculty</label>
          <input
            id="faculty"
            name="faculty"
            value={form.faculty}
            onChange={updateField}
            placeholder="Enter your faculty"
            required
          />

          <label htmlFor="department">Department</label>
          <input
            id="department"
            name="department"
            value={form.department}
            onChange={updateField}
            placeholder="Enter your department"
            required
          />

          <label htmlFor="agentCode">
            Agent Code <span>(Optional)</span>
          </label>
          <input
            id="agentCode"
            name="agentCode"
            value={form.agentCode}
            onChange={updateField}
            placeholder="Enter agent code if applicable"
          />

          <label htmlFor="password">Password</label>

          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={updateField}
              placeholder="Create a password"
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label htmlFor="confirmPassword">Confirm Password</label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={updateField}
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
          />

          <label className="terms-checkbox">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />

            <span>
              I agree to the Campus Pay Terms and Conditions and Privacy
              Policy.
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          {message && <p className="form-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <button type="button" onClick={onLogin}>
            Sign In
          </button>
        </p>
      </div>
    </section>
  );
}
