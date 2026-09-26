import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard({ onCourseRegistration }) {
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: profileData }, { data: paymentData }, { data: notificationData }] =
      await Promise.all([
        supabase
          .from("v2_user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("v2_payment_items")
          .select("*")
          .eq("account_owner_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("v2_notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)
      ]);

    setProfile(profileData);
    setPayments(paymentData || []);
    setNotifications(notificationData || []);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <section className="dashboard-page">
        <p>Loading your Campus Pay dashboard...</p>
      </section>
    );
  }

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

        <button type="button" onClick={signOut}>
          Sign Out
        </button>
      </header>

      <section className="dashboard-actions">
        <button type="button" onClick={onCourseRegistration}>
          Course Registration
        </button>

        <button type="button">
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
              <article key={payment.id} className="payment-item">
                <div>
                  <strong>
                    {payment.beneficiary_department || "Payment"}
                  </strong>

                  <p>
                    ₦{Number(payment.total_amount || 0).toLocaleString()}
                  </p>
                </div>

                <span className={`payment-status status-${payment.status}`}>
                  {formatStatus(payment.status)}
                </span>
              </article>
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
