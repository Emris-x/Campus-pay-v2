import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard({
  session,
  onNavigate,
  onOpenPayment,
  onOpenReceipt,
  onSignOut
}) {
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [session?.user?.id]);

  async function loadDashboard() {
    if (!session?.user?.id) return;

    setLoading(true);

    const [
      { data: profileData },
      { data: paymentData },
      { data: notificationData }
    ] = await Promise.all([
      supabase
        .from("v2_user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle(),

      supabase
        .from("v2_payment_items")
        .select("*")
        .eq("account_owner_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("v2_notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

    setProfile(profileData);
    setPayments(paymentData || []);
    setNotifications(notificationData || []);
    setLoading(false);
  }

  function handlePaymentClick(payment) {
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
      <section className="dashboard-page">
        <div className="dashboard-card">
          <p>Loading your Campus Pay dashboard...</p>
        </div>
      </section>
    );
  }

  const verifiedCount = payments.filter(
    (payment) => payment.status === "VERIFIED"
  ).length;

  const pendingCount = payments.filter(
    (payment) =>
      !["VERIFIED", "DECLINED"].includes(payment.status)
  ).length;

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Campus Pay</p>
          <h1>
            Welcome, {profile?.full_name || "Student"}
          </h1>
          <p>
            {profile?.department || "Student account"}
          </p>
        </div>

        <button type="button" onClick={onSignOut}>
          Sign Out
        </button>
      </header>

      <section className="dashboard-summary">
        <div className="dashboard-card">
          <span>Total Payments</span>
          <strong>{payments.length}</strong>
        </div>

        <div className="dashboard-card">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="dashboard-card">
          <span>Verified</span>
          <strong>{verifiedCount}</strong>
        </div>
      </section>

      <section className="dashboard-actions">
        <button
          type="button"
          onClick={() => onNavigate("course-registration")}
        >
          Course Registration
        </button>

        <button
          type="button"
          onClick={() => onNavigate("payment-history")}
        >
          Payment History
        </button>
      </section>

      <section className="dashboard-card">
        <h2>Recent Payments</h2>

        {payments.length === 0 ? (
          <p>No payments yet.</p>
        ) : (
          <div className="payment-list">
            {payments.slice(0, 5).map((payment) => (
              <button
                key={payment.id}
                type="button"
                className="payment-item"
                onClick={() => handlePaymentClick(payment)}
              >
                <div>
                  <strong>
                    {payment.destination_department ||
                      payment.beneficiary_department ||
                      "Payment"}
                  </strong>

                  <p>
                    ₦
                    {Number(
                      payment.total_amount || 0
                    ).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`payment-status status-${String(
                    payment.status
                  ).toLowerCase()}`}
                >
                  {formatStatus(payment.status)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-card">
        <h2>Notifications</h2>

        {notifications.length === 0 ? (
          <p>No new notifications.</p>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article key={notification.id}>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function formatStatus(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
