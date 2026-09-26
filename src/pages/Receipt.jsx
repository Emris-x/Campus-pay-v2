import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Receipt({ paymentId, onBack }) {
  const [payment, setPayment] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (paymentId) {
      loadReceipt();
    } else {
      setError("Receipt could not be found.");
      setLoading(false);
    }
  }, [paymentId]);

  async function loadReceipt() {
    setLoading(true);
    setError("");

    const [
      { data: paymentData, error: paymentError },
      { data: itemData, error: itemError },
      { data: settingsData, error: settingsError }
    ] = await Promise.all([
      supabase
        .from("v2_payment_batches")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle(),

      supabase
        .from("v2_payment_items")
        .select("*")
        .eq("batch_id", paymentId)
        .order("created_at"),

      supabase
        .from("v2_settings")
        .select("*")
    ]);

    if (paymentError || itemError || settingsError) {
      setError("Unable to load the receipt.");
      setLoading(false);
      return;
    }

    if (!paymentData) {
      setError("Receipt not found.");
      setLoading(false);
      return;
    }

    setPayment(paymentData);
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

  function formatDate(date) {
    return new Date(date).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function getWhatsAppLink() {
    const number = getSetting(
      "campus_pay_whatsapp",
      "09113632698"
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
          <strong>PAYMENT SUCCESSFUL</strong>
        </div>

        <div className="receipt-number">
          <span>Receipt Number</span>
          <strong>
            {payment.receipt_number || "Processing"}
          </strong>
        </div>

        <section className="receipt-section">
          <h2>Student Information</h2>

          <div className="receipt-row">
            <span>Name</span>
            <strong>{payment.beneficiary_full_name}</strong>
          </div>

          <div className="receipt-row">
            <span>Matriculation Number</span>
            <strong>
              {payment.beneficiary_matriculation_number}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Registration Number</span>
            <strong>
              {payment.beneficiary_registration_number}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Faculty</span>
            <strong>{payment.beneficiary_faculty}</strong>
          </div>

          <div className="receipt-row">
            <span>Department</span>
            <strong>{payment.beneficiary_department}</strong>
          </div>
        </section>

        <section className="receipt-section">
          <h2>Payment Details</h2>

          {items.map((item, index) => (
            <div className="receipt-payment" key={item.id}>
              <div>
                <span>Payment {index + 1}</span>
                <p>
                  {item.destination_name_snapshot ||
                    "Faculty / Department"}
                </p>
              </div>

              <strong>
                {formatCurrency(item.total_amount)}
              </strong>
            </div>
          ))}

          <div className="receipt-total">
            <span>Total Paid</span>
            <strong>
              {formatCurrency(payment.total_amount)}
            </strong>
          </div>
        </section>

        <section className="receipt-section">
          <div className="receipt-row">
            <span>Verified Date</span>
            <strong>
              {formatDate(
                payment.verified_at || payment.updated_at
              )}
            </strong>
          </div>
        </section>

        <footer className="receipt-footer">
          <p>
            Keep this receipt as proof of your Campus Pay
            transaction.
          </p>

          <p>
            For your physical bank-verified receipt, contact
            Campus Pay through WhatsApp.
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
