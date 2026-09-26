import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const MAX_PAYMENTS = 10;

export default function CourseRegistration({
  onBack,
  onPaymentCreated
}) {
  const [mode, setMode] = useState("self");
  const [profile, setProfile] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [items, setItems] = useState([
    {
      destinationId: "",
      amount: ""
    }
  ]);

  const [beneficiary, setBeneficiary] = useState({
    fullName: "",
    matricNumber: "",
    registrationNumber: "",
    faculty: "",
    department: ""
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Your session has expired. Please log in again.");
      setLoading(false);
      return;
    }

    const [
      { data: profileData, error: profileError },
      { data: destinationData, error: destinationError }
    ] = await Promise.all([
      supabase
        .from("v2_user_profiles")
        .select(
          "full_name, email, phone, matriculation_number, registration_number, faculty, department"
        )
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("v2_destinations")
        .select(
          "id, faculty, department, bank_name, account_name, account_number"
        )
        .eq("is_active", true)
        .order("faculty", { ascending: true })
        .order("department", { ascending: true })
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

    if (!profileData) {
      setError(
        "Your Campus Pay profile could not be found. Please contact support."
      );
      setLoading(false);
      return;
    }

    setProfile(profileData);
    setDestinations(destinationData || []);

    setBeneficiary({
      fullName: profileData.full_name || "",
      matricNumber: profileData.matriculation_number || "",
      registrationNumber: profileData.registration_number || "",
      faculty: profileData.faculty || "",
      department: profileData.department || ""
    });

    setLoading(false);
  }

  const faculties = useMemo(() => {
    return [...new Set(destinations.map((item) => item.faculty))]
      .filter(Boolean)
      .sort();
  }, [destinations]);

  const beneficiaryDepartments = useMemo(() => {
    if (!beneficiary.faculty) {
      return [];
    }

    return [
      ...new Set(
        destinations
          .filter((item) => item.faculty === beneficiary.faculty)
          .map((item) => item.department)
      )
    ].filter(Boolean).sort();
  }, [destinations, beneficiary.faculty]);

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

    setBeneficiary((current) => {
      if (name === "faculty") {
        return {
          ...current,
          faculty: value,
          department: ""
        };
      }

      return {
        ...current,
        [name]: value
      };
    });
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    if (
      !beneficiary.fullName.trim() ||
      !beneficiary.matricNumber.trim() ||
      !beneficiary.registrationNumber.trim() ||
      !beneficiary.faculty.trim() ||
      !beneficiary.department.trim()
    ) {
      setError("Please complete all student information.");
      return;
    }

    const cleanedItems = items.map((item) => ({
      destination_id: item.destinationId,
      course_amount: Number(item.amount)
    }));

    const invalidItem = cleanedItems.some(
      (item) =>
        !item.destination_id ||
        !Number.isFinite(item.course_amount) ||
        item.course_amount <= 0
    );

    if (invalidItem) {
      setError(
        "Please select a payment destination and enter a valid amount for every payment."
      );
      return;
    }

    setSubmitting(true);

    const {
      data: batchId,
      error: rpcError
    } = await supabase.rpc("v2_create_payment_batch", {
      p_items: cleanedItems.map((item) => ({
        ...item,
        payment_for:
          mode === "self" ? "MYSELF" : "SOMEONE_ELSE",
        payer_name: profile?.full_name || "",
        payer_email: profile?.email || "",
        payer_phone: profile?.phone || "",
        beneficiary_name: beneficiary.fullName.trim(),
        beneficiary_matriculation_number:
          beneficiary.matricNumber.trim(),
        beneficiary_registration_number:
          beneficiary.registrationNumber.trim(),
        beneficiary_faculty: beneficiary.faculty.trim(),
        beneficiary_department: beneficiary.department.trim()
      }))
    });

    if (rpcError) {
      setError(
        rpcError.message ||
          "Unable to create the payment request. Please try again."
      );
      setSubmitting(false);
      return;
    }

    if (!batchId) {
      setError("Payment request was created without a valid batch.");
      setSubmitting(false);
      return;
    }

    const {
      data: firstItem,
      error: itemError
    } = await supabase
      .from("v2_payment_items")
      .select("id")
      .eq("batch_id", batchId)
      .eq("account_owner_id", profile?.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (itemError || !firstItem) {
      setError(
        "Payment request was created, but we could not open its payment details. Please check Payment History."
      );
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (onPaymentCreated) {
      onPaymentCreated(firstItem.id);
    }
  }

  if (loading) {
    return (
      <section className="payment-page">
        <div className="payment-card">
          <p>Loading payment information...</p>
        </div>
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

      <form className="payment-card" onSubmit={handleSubmit}>
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
            Someone Else
          </button>
        </div>

        {mode === "third_party" && (
          <p className="form-hint">
            You are the payer. Enter the details of the student whose
            registration you are paying for.
          </p>
        )}

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
        <select
          id="beneficiary-faculty"
          name="faculty"
          value={beneficiary.faculty}
          onChange={updateBeneficiary}
          disabled={mode === "self"}
          required
        >
          <option value="">Select faculty</option>

          {faculties.map((faculty) => (
            <option key={faculty} value={faculty}>
              {faculty}
            </option>
          ))}
        </select>

        <label htmlFor="beneficiary-department">
          Department
        </label>
        <select
          id="beneficiary-department"
          name="department"
          value={beneficiary.department}
          onChange={updateBeneficiary}
          disabled={mode === "self" || !beneficiary.faculty}
          required
        >
          <option value="">Select department</option>

          {beneficiaryDepartments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>

        <div className="payment-count">
          <label htmlFor="payment-count">
            Number of Payments
          </label>

          <select
            id="payment-count"
            value={items.length}
            onChange={updatePaymentCount}
          >
            {Array.from(
              { length: MAX_PAYMENTS },
              (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}{" "}
                  {index === 0 ? "Payment" : "Payments"}
                </option>
              )
            )}
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
                  {destination.faculty} —{" "}
                  {destination.department}
                </option>
              ))}
            </select>

            <label htmlFor={`amount-${index}`}>
              Course Registration Amount
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

        <button type="submit" disabled={submitting}>
          {submitting
            ? "Preparing Payment..."
            : "Continue"}
        </button>
      </form>
    </section>
  );
}
