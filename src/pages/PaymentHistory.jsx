import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function PaymentHistory({ onBack, onOpenPayment }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
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

    const { data, error: paymentError } = await supabase
      .from("v2_payment_batches")
      .select("*")
      .eq("account_owner_id", user.id)
      .order("created_at", { ascending: false });

    if (paymentError) {
      setError("Unable to load your payment history.");
    } else {
      setPayments(data || []);
    }

    setLoading(false);
  }

  function formatCurrency(amount) {
    return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
  }

  function formatDate(date) {
    return new Date(date).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function formatStatus(status) {
    return String(status || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return (
    <section className="history-page">
      <div className="page-header">
        <button type="button" onClick={onBack}>
          Back
        </button>

        <div>
          <p className="eyebrow">Campus Pay</p>
          <h1>Payment History</h1>
        </div>
      </div>

      {loading && <p>Loading payment history...</p>}

      {error && <p className="form-error">{error}</p>}

      {!loading && !error && payments.length === 0 && (
        <div className="empty-state">
          <h2>No payments yet</h2>
          <p>Your Campus Pay transactions will appear here.</p>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="history-list">
          {payments.map((payment) => (
            <article className="history-card" key={payment.id}>
              <div>
                <p className="history-date">
                  {formatDate(payment.created_at)}
                </p>

                <h2>
                  {payment.beneficiary_full_name || "Student"}
                </h2>

                <p>
                  {payment.beneficiary_department || "Department"}
                </p>

                <strong>
                  {formatCurrency(payment.total_amount)}
                </strong>
              </div>

              <div className="history-side">
                <span
                  className={`payment-status status-${payment.status}`}
                >
                  {formatStatus(payment.status)}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onOpenPayment?.(payment.id)
                  }
                >
                  View
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
