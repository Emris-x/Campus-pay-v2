import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MAX_PAYMENTS = 10;

export default function CourseRegistration({ onBack, onContinue }) {
  const [mode, setMode] = useState("self");
  const [profile, setProfile] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [items, setItems] = useState([
    {
      destinationId: "",
      amount: ""
    }
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [beneficiary, setBeneficiary] = useState({
    fullName: "",
    matricNumber: "",
    registrationNumber: "",
    faculty: "",
    department: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session has expired. Please log in again.");
      setLoading(false);
      return;
    }

    const [{ data: profileData, error: profileError }, { data: destinationData, error: destinationError }] =
      await Promise.all([
        supabase
          .from("v2_user_profiles")
          .select(
            "full_name, matriculation_number, registration_number, faculty, department"
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("v2_payment_destinations")
          .select("id, name, bank_name, account_name, account_number")
          .eq("is_active", true)
          .order("name")
      ]);

    if (profileError) {
      setError("Unable to load your profile.");
      setLoading(false);
      return;
    }

    if (destinationError) {
      setError("Unable to load payment destinations.");
      setLoading(false);
      return;
    }

    setProfile(profileData);
    setDestinations(destinationData || []);

    setBeneficiary({
      fullName: profileData?.full_name || "",
      matricNumber: profileData?.matriculation_number || "",
      registrationNumber: profileData?.registration_number || "",
      faculty: profileData?.faculty || "",
      department: profileData?.department || ""
    });

    setLoading(false);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");

    if (nextMode === "self" && profile) {
      setBeneficiary({
        fullName: profile.full_name || "",
        matricNumber: profile.matriculation_number || "",
        registrationNumber: profile.registration_number || "",
        faculty: profile.faculty || "",
        department: profile.department || ""
      });
    }

    if (nextMode === "third_party") {
      setBeneficiary({
        fullName: "",
        matricNumber: "",
        registrationNumber: "",
        faculty: "",
        department: ""
      });
    }
  }

  function updateBeneficiary(event) {
    const { name, value } = event.target;

    setBeneficiary((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  }

  function updatePaymentCount(event) {
    const count = Number(event.target.value);

    if (!Number.isInteger(count) || count < 1 || count > MAX_PAYMENTS) {
      return;
    }

    setItems((current) =>
      Array.from({ length: count }, (_, index) => ({
        destinationId: current[index]?.destinationId || "",
        amount: current[index]?.amount || ""
      }))
    );
  }

  async function handleContinue(event) {
    event.preventDefault();

    setError("");

    if (
      !beneficiary.fullName.trim() ||
      !beneficiary.matricNumber.trim() ||
      !beneficiary.registrationNumber.trim() ||
      !beneficiary.faculty.trim() ||
      !beneficiary.department.trim()
    ) {
      setError("Please complete all beneficiary information.");
      return;
    }

    const cleanedItems = items.map((item) => ({
      destinationId: item.destinationId,
      amount: Number(item.amount)
    }));

    if (
      cleanedItems.some(
        (item) =>
          !item.destinationId ||
          !Number.isFinite(item.amount) ||
          item.amount <= 0
      )
    ) {
      setError("Please select a destination and enter a valid amount for every payment.");
      return;
    }

    setSubmitting(true);

    const { data, error: rpcError } = await supabase.rpc(
      "create_payment_batch",
      {
        p_beneficiary_full_name: beneficiary.fullName.trim(),
        p_beneficiary_matriculation_number:
          beneficiary.matricNumber.trim(),
        p_beneficiary_registration_number:
          beneficiary.registrationNumber.trim(),
        p_beneficiary_faculty: beneficiary.faculty.trim(),
        p_beneficiary_department: beneficiary.department.trim(),
        p_items: cleanedItems
      }
    );

    if (rpcError) {
      setError(
        rpcError.message || "Unable to create the payment request."
      );
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (onContinue) {
      onContinue(data);
    }
  }

  if (loading) {
    return (
      <section className="payment-page">
        <p>Loading payment information...</p>
      </section>
    );
  }

  return (
    <section className="payment-page">
      <div className="page-header">
        <button type="button" onClick={onBack}>
          Back
        </button>

        <div>
          <p className="eyebrow">Course Registration</p>
          <h1>Create Payment</h1>
        </div>
      </div>

      <div className="payment-card">
        <h2>Who are you paying for?</h2>

        <div className="choice-group">
          <button
            type="button"
            className={mode === "self" ? "selected" : ""}
            onClick={() => changeMode("self")}
          >
            Myself
          </button>

          <button
            type="button"
            className={mode === "third_party" ? "selected" : ""}
            onClick={() => changeMode("third_party")}
          >
            Another Student
          </button>
        </div>

        <h2>Student Information</h2>

        <label htmlFor="beneficiary-name">Full Name</label>
        <input
          id="beneficiary-name"
          name="fullName"
          value={beneficiary.fullName}
          onChange={updateBeneficiary}
          readOnly={mode === "self"}
          required
        />

        <label htmlFor="beneficiary-matric">
          Matriculation Number
        </label>
        <input
          id="beneficiary-matric"
          name="matricNumber"
          value={beneficiary.matricNumber}
          onChange={updateBeneficiary}
          readOnly={mode === "self"}
          required
        />

        <label htmlFor="beneficiary-registration">
          Registration Number
        </label>
        <input
          id="beneficiary-registration"
          name="registrationNumber"
          value={beneficiary.registrationNumber}
          onChange={updateBeneficiary}
          readOnly={mode === "self"}
          required
        />

        <label htmlFor="beneficiary-faculty">Faculty</label>
        <input
          id="beneficiary-faculty"
          name="faculty"
          value={beneficiary.faculty}
          onChange={updateBeneficiary}
          readOnly={mode === "self"}
          required
        />

        <label htmlFor="beneficiary-department">Department</label>
        <input
          id="beneficiary-department"
          name="department"
          value={beneficiary.department}
          onChange={updateBeneficiary}
          readOnly={mode === "self"}
          required
        />

        <div className="payment-count">
          <label htmlFor="payment-count">
            Number of Payments
          </label>

          <select
            id="payment-count"
            value={items.length}
            onChange={updatePaymentCount}
          >
            {Array.from({ length: MAX_PAYMENTS }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} {index === 0 ? "Payment" : "Payments"}
              </option>
            ))}
          </select>
        </div>

        <h2>Payment Details</h2>

        {items.map((item, index) => (
          <div className="payment-row" key={index}>
            <h3>Payment {index + 1}</h3>

            <label htmlFor={`destination-${index}`}>
              Payment Destination
            </label>

            <select
              id={`destination-${index}`}
              value={item.destinationId}
              onChange={(event) =>
                updateItem(
                  index,
                  "destinationId",
                  event.target.value
                )
              }
              required
            >
              <option value="">Select destination</option>

              {destinations.map((destination) => (
                <option
                  key={destination.id}
                  value={destination.id}
                >
                  {destination.name}
                </option>
              ))}
            </select>

            <label htmlFor={`amount-${index}`}>
              Amount
            </label>

            <input
              id={`amount-${index}`}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={item.amount}
              onChange={(event) =>
                updateItem(index, "amount", event.target.value)
              }
              placeholder="Enter amount"
              required
            />
          </div>
        ))}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting} onClick={handleContinue}>
          {submitting ? "Preparing Payment..." : "Continue"}
        </button>
      </div>
    </section>
  );
          }
