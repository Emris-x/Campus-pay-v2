import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const COUNTDOWN_SECONDS = 30 * 60;

export default function PaymentDetails({ batchId, onBack, onComplete }) {
  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState([]);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!batchId) {
      setError("Payment request could not be found.");
      setLoading(false);
      return;
    }

    loadPayment();
  }, [batchId]);

  useEffect(() => {
    if (!batch?.student_confirmation_deadline) {
      return undefined;
    }

    const updateCountdown = () => {
      const deadline = new Date(
        batch.student_confirmation_deadline
      ).getTime();

      const seconds = Math.max(
        0,
        Math.floor((deadline - Date.now()) / 1000)
      );

      setRemaining(seconds);
    };

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [batch]);

  async function loadPayment() {
    setLoading(true);
    setError("");

    const [
      { data: batchData, error: batchError },
      { data: itemData, error: itemError },
      { data: settingsData, error: settingsError }
    ] = await Promise.all([
      supabase
        .from("v2_payment_batches")
        .select("*")
        .eq("id", batchId)
        .maybeSingle(),

      supabase
        .from("v2_payment_items")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at"),

      supabase
        .from("v2_settings")
        .select("*")
    ]);

    if (batchError || itemError || settingsError) {
      setError("Unable to load this payment.");
      setLoading(false);
      return;
    }

    if (!batchData) {
      setError("Payment request not found.");
      setLoading(false);
      return;
    }

    setBatch(batchData);
    setItems(itemData || []);
    setSettings(settingsData || []);
    setLoading(false);
  }

  function getSetting(key, fallback = "") {
    const setting = settings.find((item) => item.key === key);

    return setting?.value ?? fallback;
  }

  function formatCurrency(amount) {
    return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  async function copyValue(value) {
    try {
      await navigator.clipboard.writeText(String(value || ""));
    } catch {
      setError("Unable to copy. Please copy the information manually.");
    }
  }

  async function confirmTransfer() {
    setError("");

    if (remaining <= 0) {
      setError(
        "The confirmation period has expired. Please contact Campus Pay."
      );
      return;
    }

    setConfirming(true);

    const { data, error: rpcError } = await supabase.rpc(
      "confirm_student_transfer",
      {
        p_batch_id: batchId
      }
    );

    if (rpcError) {
      setError(
        rpcError.message ||
          "Unable to confirm your transfer right now."
      );
      setConfirming(false);
      return;
    }

    setConfirming(false);

    if (onComplete) {
      onComplete(data);
    }
  }

  if (loading) {
    return (
      <section className="payment-page">
        <p>Loading payment instructions...</p>
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
          <p className="eyebrow">Payment Instructions</p>
          <h1>Complete Your Transfer</h1>
        </div>
      </div>

      <div className="payment-card">
        <div className="countdown-card">
          <span>Confirmation window</span>
          <strong>{formatTime(remaining)}</strong>

          {remaining === 0 && (
            <p>
              Your confirmation window has expired. Please contact
              Campus Pay.
            </p>
          )}
        </div>

        <div className="beneficiary-summary">
          <h2>Payment For</h2>

          <p>
            <strong>Name:</strong>{" "}
            {batch.beneficiary_full_name}
          </p>

          <p>
            <strong>Matriculation Number:</strong>{" "}
            {batch.beneficiary_matriculation_number}
          </p>

          <p>
            <strong>Registration Number:</strong>{" "}
            {batch.beneficiary_registration_number}
          </p>

          <p>
            <strong>Faculty:</strong>{" "}
            {batch.beneficiary_faculty}
          </p>

          <p>
            <strong>Department:</strong>{" "}
            {batch.beneficiary_department}
          </p>
        </div>

        <div className="transfer-details">
          <h2>Transfer To Campus Pay</h2>

          <div className="copy-field">
            <span>Bank</span>
            <strong>
              {getSetting("campus_pay_bank_name", "Sterling Bank")}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(
                  getSetting(
                    "campus_pay_bank_name",
                    "Sterling Bank"
                  )
                )
              }
            >
              Copy
            </button>
          </div>

          <div className="copy-field">
            <span>Account Name</span>
            <strong>
              {getSetting(
                "campus_pay_account_name",
                "Emmanuel Echefu"
              )}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(
                  getSetting(
                    "campus_pay_account_name",
                    "Emmanuel Echefu"
                  )
                )
              }
            >
              Copy
            </button>
          </div>

          <div className="copy-field">
            <span>Account Number</span>
            <strong>
              {getSetting(
                "campus_pay_account_number",
                "0148968494"
              )}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(
                  getSetting(
                    "campus_pay_account_number",
                    "0148968494"
                  )
                )
              }
            >
              Copy
            </button>
          </div>

          <div className="copy-field">
            <span>Total Amount</span>
            <strong>
              {formatCurrency(batch.total_amount)}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(batch.total_amount)
              }
            >
              Copy
            </button>
          </div>
        </div>

        <div className="payment-breakdown">
          <h2>Payment Breakdown</h2>

          {items.map((item, index) => (
            <div className="breakdown-row" key={item.id}>
              <span>
                Payment {index + 1}
              </span>

              <strong>
                {formatCurrency(item.total_amount)}
              </strong>
            </div>
          ))}

          <div className="breakdown-row total">
            <span>Total</span>
            <strong>
              {formatCurrency(batch.total_amount)}
            </strong>
          </div>
        </div>

        <div className="payment-notice">
          <p>
            Transfer the exact total amount shown above to the
            Campus Pay account.
          </p>

          <p>
            After completing the transfer, return here and press
            <strong> Confirm Transfer</strong>.
          </p>

          <p>
            Pressing the button only confirms that you have made
            the transfer. Campus Pay will still verify the money
            received before processing the payment to the selected
            destination.
          </p>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          type="button"
          onClick={confirmTransfer}
          disabled={confirming || remaining === 0}
        >
          {confirming
            ? "Confirming..."
            : "Confirm Transfer"}
        </button>
      </div>
    </section>
  );
      }
