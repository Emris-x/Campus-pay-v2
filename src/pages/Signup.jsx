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

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const matricNumber = form.matricNumber.trim();
    const registrationNumber = form.registrationNumber.trim();
    const faculty = form.faculty.trim();
    const department = form.department.trim();
    const agentCode = form.agentCode.trim();

    if (!acceptedTerms) {
      setError(
        "You must agree to the Campus Pay Terms and Conditions and Privacy Policy."
      );
      return;
    }

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }

    if (!matricNumber) {
      setError("Please enter your matriculation number.");
      return;
    }

    if (!registrationNumber) {
      setError("Please enter your registration number.");
      return;
    }

    if (!faculty) {
      setError("Please enter your faculty.");
      return;
    }

    if (!department) {
      setError("Please enter your department.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Make sure the current legal documents exist before
       * allowing a new Campus Pay account to be created.
       */
      const { data: legalDocuments, error: legalError } =
        await supabase
          .from("v2_legal_documents")
          .select("id, document_type, version")
          .eq("is_current", true)
          .in("document_type", ["terms", "privacy"]);

      if (legalError) {
        setError(
          "Unable to verify the Campus Pay registration documents. Please try again."
        );
        setLoading(false);
        return;
      }

      const hasTerms = legalDocuments?.some(
        (document) => document.document_type === "terms"
      );

      const hasPrivacy = legalDocuments?.some(
        (document) => document.document_type === "privacy"
      );

      if (!hasTerms || !hasPrivacy) {
        setError(
          "Campus Pay registration documents are not currently available. Please try again later."
        );
        setLoading(false);
        return;
      }

      /*
       * Supabase Auth creates the account.
       *
       * The database trigger v2_handle_new_user()
       * automatically creates the corresponding V2
       * student profile and records legal acceptance.
       */
      const { data, error: signupError } =
        await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            data: {
              full_name: fullName,
              phone,
              matriculation_number: matricNumber,
              registration_number: registrationNumber,
              faculty,
              department,
              agent_code: agentCode || null,
              accepted_terms: true
            }
          }
        });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError(
          "The account could not be created. Please try again."
        );
        setLoading(false);
        return;
      }

      if (data.session) {
        const {
          data: profile,
          error: profileError
        } = await supabase
          .from("v2_user_profiles")
          .select("legal_accepted")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) {
          setError(
            "Your account was created, but your profile could not be loaded. Please contact Campus Pay support."
          );
          setLoading(false);
          return;
        }

        if (!profile?.legal_accepted) {
          setError(
            "Your account was created, but legal acceptance could not be completed. Please contact Campus Pay support."
          );
          setLoading(false);
          return;
        }

        setMessage(
          "Account created successfully. Welcome to Campus Pay."
        );
      } else {
        setMessage(
          "Account created successfully. Please check your email to verify your account before signing in."
        );
      }
    } catch (submitError) {
      setError(
        submitError?.message ||
          "Something went wrong while creating your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <h1>Campus Pay</h1>
          <p>Create your student account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="fullName">
            Full Name
          </label>

          <input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={updateField}
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />

          <label htmlFor="email">
            Email
          </label>

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

          <label htmlFor="phone">
            Phone Number
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={updateField}
            placeholder="Enter your phone number"
            autoComplete="tel"
            required
          />

          <label htmlFor="matricNumber">
            Matriculation Number
          </label>

          <input
            id="matricNumber"
            name="matricNumber"
            value={form.matricNumber}
            onChange={updateField}
            placeholder="Enter your matriculation number"
            required
          />

          <label htmlFor="registrationNumber">
            Registration Number
          </label>

          <input
            id="registrationNumber"
            name="registrationNumber"
            value={form.registrationNumber}
            onChange={updateField}
            placeholder="Enter your registration number"
            required
          />

          <label htmlFor="faculty">
            Faculty
          </label>

          <input
            id="faculty"
            name="faculty"
            value={form.faculty}
            onChange={updateField}
            placeholder="Enter your faculty"
            required
          />

          <label htmlFor="department">
            Department
          </label>

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
            autoComplete="off"
          />

          <label htmlFor="password">
            Password
          </label>

          <div className="password-field">
            <input
              id="password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={form.password}
              onChange={updateField}
              placeholder="Create a password"
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label htmlFor="confirmPassword">
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type={
              showPassword
                ? "text"
                : "password"
            }
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
              onChange={(event) =>
                setAcceptedTerms(
                  event.target.checked
                )
              }
            />

            <span>
              I agree to the Campus Pay Terms and
              Conditions and Privacy Policy.
            </span>
          </label>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          {message && (
            <p className="form-success">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLogin}
          >
            Sign In
          </button>
        </p>
      </div>
    </section>
  );
}
