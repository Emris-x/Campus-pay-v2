import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function PaymentDetails({
  paymentId,
  onBack,
  onOpenReceipt
}) {
  const [item, setItem] = useState(null);
  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState([]);
  const [remaining, setRemaining] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId) {
      setError("Payment request could not be found.");
      setLoading(false);
      return;
    }

    loadPayment();
  }, [paymentId]);

  useEffect(() => {
    if (!item?.confirmation_deadline) {
      setRemaining(0);
      return undefined;
    }

    function updateCountdown() {
      const deadline = new Date(
        item.confirmation_deadline
      ).getTime();

      const seconds = Math.max(
        0,
        Math.floor((deadline - Date.now()) / 1000)
      );

      setRemaining(seconds);
    }

    updateCountdown();

    const timer = window.setInterval(
      updateCountdown,
      1000
    );

    return () => window.clearInterval(timer);
  }, [item?.confirmation_deadline]);

  async function loadPayment() {
    setLoading(true);
    setError("");

    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session has expired. Please log in again.");
      setLoading(false);
      return;
    }

    const {
      data: itemData,
      error: itemError
    } = await supabase
      .from("v2_payment_items")
      .select("*")
      .eq("id", paymentId)
      .eq("account_owner_id", user.id)
      .maybeSingle();

    if (itemError || !itemData) {
      setError("Payment request not found.");
      setLoading(false);
      return;
    }

    const [
      {
        data: batchData,
        error: batchError
      },
      {
        data: batchItems,
        error: batchItemsError
      },
      {
        data: settingsData,
        error: settingsError
      }
    ] = await Promise.all([
      supabase
        .from("v2_payment_batches")
        .select("*")
        .eq("id", itemData.batch_id)
        .eq("account_owner_id", user.id)
        .maybeSingle(),

      supabase
        .from("v2_payment_items")
        .select("*")
        .eq("batch_id", itemData.batch_id)
        .eq("account_owner_id", user.id)
        .order("created_at", {
          ascending: true
        }),

      supabase
        .from("v2_settings")
        .select("key, value")
    ]);

    if (
      batchError ||
      batchItemsError ||
      settingsError
    ) {
      setError("Unable to load payment information.");
      setLoading(false);
      return;
    }

    if (!batchData) {
      setError("Payment batch could not be found.");
      setLoading(false);
      return;
    }

    setItem(itemData);
    setBatch(batchData);
    setItems(batchItems || []);
    setSettings(settingsData || []);
    setLoading(false);
  }

  function getSetting(key, fallback = "") {
    const setting = settings.find(
      (entry) => entry.key === key
    );

    if (!setting) {
      return fallback;
    }

    const value = setting.value;

    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "value" in value
    ) {
      return value.value;
    }

    return value;
  }

  function formatCurrency(amount) {
    return `₦${Number(
      amount || 0
    ).toLocaleString("en-NG")}`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  }

  async function copyValue(value) {
    try {
      await navigator.clipboard.writeText(
        String(value ?? "")
      );
    } catch {
      setError(
        "Unable to copy. Please copy the information manually."
      );
    }
  }

  async function submitPayment() {
    if (submitting) {
      return;
    }

    setError("");

    if (!item) {
      setError("Payment request could not be found.");
      return;
    }

    if (item.status !== "AWAITING_PAYMENT") {
      if (item.status === "PAYMENT_SUBMITTED") {
        setError(
          "You have already submitted this payment. Campus Pay is checking it."
        );
      } else {
        setError(
          "This payment is no longer awaiting your transfer."
        );
      }

      return;
    }

    if (remaining <= 0) {
      setError(
        "The confirmation window has expired. Contact Campus Pay if you have already transferred the money."
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirm that you have transferred exactly ${formatCurrency(
        batch?.total_amount
      )} to the Campus Pay account shown below.`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    const {
      data,
      error: rpcError
    } = await supabase.rpc(
      "v2_submit_payment",
      {
        p_item_id: item.id
      }
    );

    if (rpcError) {
      setError(
        rpcError.message ||
          "Unable to submit the payment right now."
      );
      setSubmitting(false);
      return;
    }

    if (!data) {
      setError(
        "Payment submission did not return a result."
      );
      setSubmitting(false);
      return;
    }

    await loadPayment();

    setSubmitting(false);
  }

  function getStatusLabel(status) {
    switch (status) {
      case "AWAITING_PAYMENT":
        return "Awaiting Payment";

      case "PAYMENT_SUBMITTED":
        return "Payment Submitted";

      case "PAYMENT_RECEIVED":
        return "Payment Received";

      case "PROCESSING_FACULTY_PAYMENT":
        return "Faculty Payment Processing";

      case "VERIFIED":
        return "Verified";

      case "DECLINED":
        return "Declined";

      case "REPROCESSING":
        return "Reprocessing";

      default:
        return status || "Unknown";
    }
  }

  if (loading) {
    return (
      <section className="payment-page">
        <div className="payment-card">
          <p>Loading payment instructions...</p>
        </div>
      </section>
    );
  }

  if (!item || !batch) {
    return (
      <section className="payment-page">
        <div className="payment-card">
          <p className="form-error">
            {error || "Payment request not found."}
          </p>

          <button
            type="button"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  const canSubmit =
    item.status === "AWAITING_PAYMENT" &&
    remaining > 0;

  const campusPayBank = getSetting(
    "collection_bank_name",
    "Sterling Bank"
  );

  const campusPayAccountName = getSetting(
    "collection_account_name",
    "Emmanuel Echefu"
  );

  const campusPayAccountNumber = getSetting(
    "collection_account_number",
    "0148968494"
  );

  return (
    <section className="payment-page">
      <div className="page-header">
        <button
          type="button"
          onClick={onBack}
        >
          Back
        </button>

        <div>
          <p className="eyebrow">
            Payment Instructions
          </p>

          <h1>Complete Your Transfer</h1>
        </div>
      </div>

      <div className="payment-card">
        <div className="status-card">
          <span>Status</span>
          <strong>
            {getStatusLabel(item.status)}
          </strong>
        </div>

        {item.status === "AWAITING_PAYMENT" && (
          <div className="countdown-card">
            <span>Confirmation window</span>

            <strong>
              {formatTime(remaining)}
            </strong>

            {remaining === 0 && (
              <p>
                The confirmation window has expired.
                This does not automatically cancel the
                payment. Contact Campus Pay if you have
                already transferred the money.
              </p>
            )}
          </div>
        )}

        <div className="beneficiary-summary">
          <h2>Payment For</h2>

          <p>
            <strong>Name:</strong>{" "}
            {item.beneficiary_name}
          </p>

          <p>
            <strong>Matriculation Number:</strong>{" "}
            {item.beneficiary_matriculation_number}
          </p>

          <p>
            <strong>Registration Number:</strong>{" "}
            {item.beneficiary_registration_number}
          </p>

          <p>
            <strong>Faculty:</strong>{" "}
            {item.beneficiary_faculty}
          </p>

          <p>
            <strong>Department:</strong>{" "}
            {item.beneficiary_department}
          </p>
        </div>

        {item.payment_for === "SOMEONE_ELSE" && (
          <div className="beneficiary-summary">
            <h2>Payer</h2>

            <p>
              <strong>Name:</strong>{" "}
              {item.payer_name}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {item.payer_email}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {item.payer_phone}
            </p>
          </div>
        )}

        <div className="transfer-details">
          <h2>Transfer To Campus Pay</h2>

          <div className="copy-field">
            <span>Bank</span>

            <strong>
              {campusPayBank}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(campusPayBank)
              }
            >
              Copy
            </button>
          </div>

          <div className="copy-field">
            <span>Account Name</span>

            <strong>
              {campusPayAccountName}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(
                  campusPayAccountName
                )
              }
            >
              Copy
            </button>
          </div>

          <div className="copy-field">
            <span>Account Number</span>

            <strong>
              {campusPayAccountNumber}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(
                  campusPayAccountNumber
                )
              }
            >
              Copy
            </button>
          </div>

          <div className="copy-field">
            <span>Exact Amount To Transfer</span>

            <strong>
              {formatCurrency(
                batch.total_amount
              )}
            </strong>

            <button
              type="button"
              onClick={() =>
                copyValue(
                  batch.total_amount
                )
              }
            >
              Copy
            </button>
          </div>
        </div>

        <div className="payment-breakdown">
          <h2>Payment Breakdown</h2>

          {items.map((payment, index) => (
            <div
              className="breakdown-row"
              key={payment.id}
            >
              <span>
                Payment {index + 1}
              </span>

              <strong>
                {formatCurrency(
                  payment.course_amount
                )}
              </strong>
            </div>
          ))}

          <div className="breakdown-row">
            <span>
              Campus Pay Charges
            </span>

            <strong>
              {formatCurrency(
                batch.total_charges
              )}
            </strong>
          </div>

          <div className="breakdown-row total">
            <span>
              Total
            </span>

            <strong>
              {formatCurrency(
                batch.total_amount
              )}
            </strong>
          </div>
        </div>

        {items.map((payment, index) => (
          <div
            className="payment-row"
            key={payment.id}
          >
            <h3>
              Payment {index + 1}
            </h3>

            <p>
              <strong>Destination:</strong>{" "}
              {payment.destination_faculty} —{" "}
              {payment.destination_department}
            </p>

            <p>
              <strong>Bank:</strong>{" "}
              {payment.destination_bank_name}
            </p>

            <p>
              <strong>Account Name:</strong>{" "}
              {payment.destination_account_name}
            </p>

            <p>
              <strong>Account Number:</strong>{" "}
              {payment.destination_account_number}
            </p>

            <p>
              <strong>Course Amount:</strong>{" "}
              {formatCurrency(
                payment.course_amount
              )}
            </p>

            <p>
              <strong>Campus Pay Charge:</strong>{" "}
              {formatCurrency(
                payment.campus_pay_charge
              )}
            </p>

            <p>
              <strong>Total:</strong>{" "}
              {formatCurrency(
                payment.total_amount
              )}
            </p>
          </div>
        ))}

        {item.status === "AWAITING_PAYMENT" && (
          <div className="payment-notice">
            <p>
              Transfer the exact total amount shown
              above to the Campus Pay account.
            </p>

            <p>
              After completing the transfer, return
              here and press{" "}
              <strong>
                I've Made the Payment
              </strong>.
            </p>

            <p>
              This only tells Campus Pay that you
              have made the transfer. Campus Pay
              will manually check the bank account
              before marking the payment as received.
            </p>
          </div>
        )}

        {item.status === "PAYMENT_SUBMITTED" && (
          <div className="payment-notice">
            <p>
              Your payment has been submitted.
            </p>

            <p>
              Campus Pay will manually check the
              collection account and update your
              payment status.
            </p>
          </div>
        )}

        {item.status === "PAYMENT_RECEIVED" && (
          <div className="payment-notice">
            <p>
              Campus Pay has confirmed receipt of
              your transfer.
            </p>

            <p>
              Your faculty payment is now being
              processed.
            </p>
          </div>
        )}

        {item.status ===
          "PROCESSING_FACULTY_PAYMENT" && (
          <div className="payment-notice">
            <p>
              Your payment has been received.
            </p>

            <p>
              Campus Pay is processing the payment
              to the selected faculty destination.
            </p>
          </div>
        )}

        {item.status === "VERIFIED" && (
          <div className="payment-notice">
            <p>
              Your payment has been verified
              successfully.
            </p>

            {onOpenReceipt && (
              <button
                type="button"
                onClick={() =>
                  onOpenReceipt(item.id)
                }
              >
                View Receipt
              </button>
            )}
          </div>
        )}

        {item.status === "DECLINED" && (
          <div className="payment-notice">
            <p>
              This payment was declined.
            </p>

            {item.decline_reason && (
              <p>
                <strong>Reason:</strong>{" "}
                {item.decline_reason}
              </p>
            )}

            {item.decline_reason_details && (
              <p>
                {item.decline_reason_details}
              </p>
            )}
          </div>
        )}

        {item.status === "REPROCESSING" && (
          <div className="payment-notice">
            <p>
              This payment is being reprocessed.
            </p>

            <p>
              Follow the payment instructions above
              and contact Campus Pay if you need
              assistance.
            </p>
          </div>
        )}

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        {item.status === "AWAITING_PAYMENT" && (
          <button
            type="button"
            onClick={submitPayment}
            disabled={!canSubmit || submitting}
          >
            {submitting
              ? "Submitting..."
              : "I've Made the Payment"}
          </button>
        )}
      </div>
    </section>
  );
}
