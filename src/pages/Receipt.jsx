import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Receipt({ session, paymentId, onBack }) {
  const [payment, setPayment] = useState(null);
  const [batch, setBatch] = useState(null);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (paymentId && session?.user?.id) {
      loadReceipt();
    } else {
      setError("Receipt could not be found.");
      setLoading(false);
    }
  }, [paymentId, session?.user?.id]);

  async function loadReceipt() {
    setLoading(true);
    setError("");

    const { data: paymentData, error: paymentError } = await supabase
      .from("v2_payment_items")
      .select("*")
      .eq("id", paymentId)
      .eq("account_owner_id", session.user.id)
      .maybeSingle();

    if (paymentError || !paymentData) {
      setError("Receipt not found.");
      setLoading(false);
      return;
    }

    if (paymentData.status !== "VERIFIED") {
      setError("This payment does not have a verified receipt yet.");
      setLoading(false);
      return;
    }

    const [
      { data: batchData, error: batchError },
      { data: settingsData, error: settingsError }
    ] = await Promise.all([
      supabase
        .from("v2_payment_batches")
        .select("*")
        .eq("id", paymentData.batch_id)
        .eq("account_owner_id", session.user.id)
        .maybeSingle(),

      supabase
        .from("v2_settings")
        .select("*")
    ]);

    if (batchError || settingsError) {
      setError("Unable to load the receipt.");
      setLoading(false);
      return;
    }

    setPayment(paymentData);
    setBatch(batchData);
    setSettings(settingsData || []);
    setLoading(false);
  }

  function getSetting(key, fallback = "") {
    const setting = settings.find((item) => item.key === key);

    if (!setting || setting.value === null || setting.value === undefined) {
      return fallback;
    }

    return setting.value;
  }

  function formatCurrency(amount) {
    return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function getWhatsAppLink() {
    const number = String(
      getSetting("campus_pay_whatsapp", "09113632698")
    ).replace(/\D/g, "");

    const message = encodeURIComponent(
      `Hello Campus Pay, I am contacting you regarding receipt ${
        payment?.receipt_number || ""
      }.`
    );

    return `https://wa.me/${number}?text=${message}`;
  }

  if (loading) {
    return (
      <section className="receipt-page">
        <p>Loading receipt...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="receipt-page">
        <p className="form-error">{error}</p>

        <button type="button" onClick={onBack}>
          Back
        </button>
      </section>
    );
  }

  return (
    <section className="receipt-page">
      <div className="receipt-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>

        <button type="button" onClick={() => window.print()}>
          Print Receipt
        </button>
      </div>

      <article className="receipt-card">
        <header className="receipt-header">
          <p className="eyebrow">Emris Technologies</p>

          <h1>Campus Pay</h1>

          <p>Verified Payment Receipt</p>
        </header>

        <div className="receipt-status">
          <strong>PAYMENT VERIFIED</strong>
        </div>

        <div className="receipt-number">
          <span>Receipt Number</span>

          <strong>
            {payment.receipt_number || "—"}
          </strong>
        </div>

        <section className="receipt-section">
          <h2>Student Information</h2>

          <div className="receipt-row">
            <span>Name</span>
            <strong>{payment.beneficiary_name || "—"}</strong>
          </div>

          <div className="receipt-row">
            <span>Matriculation Number</span>
            <strong>
              {payment.beneficiary_matriculation_number || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Registration Number</span>
            <strong>
              {payment.beneficiary_registration_number || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Faculty</span>
            <strong>{payment.beneficiary_faculty || "—"}</strong>
          </div>

          <div className="receipt-row">
            <span>Department</span>
            <strong>
              {payment.beneficiary_department || "—"}
            </strong>
          </div>
        </section>

        <section className="receipt-section">
          <h2>Payer Information</h2>

          <div className="receipt-row">
            <span>Payment For</span>
            <strong>
              {payment.payment_for === "SOMEONE_ELSE"
                ? "Someone Else"
                : "Myself"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Payer Name</span>
            <strong>{payment.payer_name || "—"}</strong>
          </div>

          <div className="receipt-row">
            <span>Payer Email</span>
            <strong>{payment.payer_email || "—"}</strong>
          </div>

          <div className="receipt-row">
            <span>Payer Phone</span>
            <strong>{payment.payer_phone || "—"}</strong>
          </div>
        </section>

        <section className="receipt-section">
          <h2>Payment Details</h2>

          <div className="receipt-row">
            <span>Faculty</span>
            <strong>
              {payment.destination_faculty || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Department</span>
            <strong>
              {payment.destination_department || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Bank</span>
            <strong>
              {payment.destination_bank_name || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Account Name</span>
            <strong>
              {payment.destination_account_name || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Account Number</span>
            <strong>
              {payment.destination_account_number || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Course Amount</span>
            <strong>
              {formatCurrency(payment.course_amount)}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Campus Pay Charge</span>
            <strong>
              {formatCurrency(payment.campus_pay_charge)}
            </strong>
          </div>

          <div className="receipt-total">
            <span>Total Paid</span>

            <strong>
              {formatCurrency(payment.total_amount)}
            </strong>
          </div>
        </section>

        <section className="receipt-section">
          <div className="receipt-row">
            <span>Payment Reference</span>
            <strong>{payment.reference || "—"}</strong>
          </div>

          <div className="receipt-row">
            <span>Verified Date</span>
            <strong>
              {formatDate(payment.verified_at)}
            </strong>
          </div>

          {batch && (
            <div className="receipt-row">
              <span>Batch Payments</span>
              <strong>{batch.item_count || 1}</strong>
            </div>
          )}
        </section>

        <footer className="receipt-footer">
          <p>
            Keep this receipt as proof of your verified Campus Pay
            transaction.
          </p>

          <p>
            For your physical bank-verified receipt, contact Campus
            Pay through WhatsApp.
          </p>

          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Campus Pay on WhatsApp
          </a>

          <p className="creator-credit">
            A product of Emris Technologies
          </p>
        </footer>
      </article>
    </section>
  );
}
