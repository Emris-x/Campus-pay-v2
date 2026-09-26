import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function PaymentHistory({
  onBack,
  onOpenPayment,
  onOpenReceipt
}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
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
      data,
      error: historyError
    } = await supabase
      .from("v2_payment_items")
      .select("*")
      .eq("account_owner_id", user.id)
      .order("created_at", {
        ascending: false
      });

    if (historyError) {
      setError("Unable to load your payment history.");
      setLoading(false);
      return;
    }

    setPayments(data || []);
    setLoading(false);
  }

  function formatCurrency(amount) {
    return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short"
    });
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

  function getStatusClass(status) {
    switch (status) {
      case "VERIFIED":
        return "status-success";

      case "DECLINED":
        return "status-error";

      case "PAYMENT_RECEIVED":
      case "PROCESSING_FACULTY_PAYMENT":
        return "status-processing";

      case "PAYMENT_SUBMITTED":
      case "REPROCESSING":
        return "status-pending";

      default:
        return "status-awaiting";
    }
  }

  function handleOpen(payment) {
    if (payment.status === "VERIFIED" && onOpenReceipt) {
      onOpenReceipt(payment.id);
      return;
    }

    if (onOpenPayment) {
      onOpenPayment(payment.id);
    }
  }

  if (loading) {
    return (
      <section className="history-page">
        <div className="page-header">
          <button
            type="button"
            onClick={onBack}
          >
            Back
          </button>

          <div>
            <p className="eyebrow">Payments</p>
            <h1>Payment History</h1>
          </div>
        </div>

        <div className="payment-card">
          <p>Loading payment history...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="history-page">
      <div className="page-header">
        <button
          type="button"
          onClick={onBack}
        >
          Back
        </button>

        <div>
          <p className="eyebrow">Payments</p>
          <h1>Payment History</h1>
        </div>
      </div>

      {error && (
        <div className="payment-card">
          <p className="form-error">{error}</p>

          <button
            type="button"
            onClick={loadHistory}
          >
            Try Again
          </button>
        </div>
      )}

      {!error && payments.length === 0 && (
        <div className="payment-card empty-state">
          <h2>No Payments Yet</h2>

          <p>
            Your Campus Pay payment history will appear here
            after you create a payment request.
          </p>

          <button
            type="button"
            onClick={onBack}
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {!error && payments.length > 0 && (
        <div className="history-list">
          {payments.map((payment) => (
            <article
              className="history-card"
              key={payment.id}
            >
              <div className="history-card-header">
                <div>
                  <p className="eyebrow">
                    {payment.reference || "Campus Pay Payment"}
                  </p>

                  <h2>
                    {payment.beneficiary_name}
                  </h2>
                </div>

                <span
                  className={`status-badge ${getStatusClass(
                    payment.status
                  )}`}
                >
                  {getStatusLabel(payment.status)}
                </span>
              </div>

              <div className="history-details">
                <div>
                  <span>Faculty</span>
                  <strong>
                    {payment.beneficiary_faculty || "—"}
                  </strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>
                    {payment.beneficiary_department || "—"}
                  </strong>
                </div>

                <div>
                  <span>Destination</span>
                  <strong>
                    {payment.destination_department
                      ? `${payment.destination_faculty} — ${payment.destination_department}`
                      : payment.destination_faculty || "—"}
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>
                    {formatCurrency(payment.total_amount)}
                  </strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>
                    {formatDate(payment.created_at)}
                  </strong>
                </div>
              </div>

              {payment.status === "DECLINED" && (
                <div className="history-notice">
                  <strong>Declined</strong>

                  {payment.decline_reason && (
                    <p>
                      Reason: {payment.decline_reason}
                    </p>
                  )}

                  {payment.decline_reason_details && (
                    <p>
                      {payment.decline_reason_details}
                    </p>
                  )}
                </div>
              )}

              <div className="history-actions">
                <button
                  type="button"
                  onClick={() => handleOpen(payment)}
                >
                  {payment.status === "VERIFIED"
                    ? "View Receipt"
                    : "View Payment"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
