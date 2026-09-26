import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CourseRegistration from "./pages/CourseRegistration";
import PaymentDetails from "./pages/PaymentDetails";
import PaymentHistory from "./pages/PaymentHistory";
import Receipt from "./pages/Receipt";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);

        if (!nextSession) {
          setPage("login");
          setSelectedPaymentId(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session && page === "login") {
      setPage("dashboard");
    }
  }, [session, page]);

  function openPayment(paymentId) {
    setSelectedPaymentId(paymentId);
    setPage("payment-details");
  }

  function openReceipt(paymentId) {
    setSelectedPaymentId(paymentId);
    setPage("receipt");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSelectedPaymentId(null);
    setPage("login");
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="auth-card">
          <h1>Campus Pay</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    if (page === "signup") {
      return (
        <Signup
          onLogin={() => setPage("login")}
        />
      );
    }

    if (page === "forgot-password") {
      return (
        <ForgotPassword
          onLogin={() => setPage("login")}
        />
      );
    }

    return (
      <Login
        onForgotPassword={() => setPage("forgot-password")}
        onSignup={() => setPage("signup")}
      />
    );
  }

  return (
    <ProtectedRoute session={session}>
      <div className="app-shell">
        {page === "dashboard" && (
          <Dashboard
            session={session}
            onNavigate={setPage}
            onOpenPayment={openPayment}
            onOpenReceipt={openReceipt}
            onSignOut={handleSignOut}
          />
        )}

        {page === "course-registration" && (
          <CourseRegistration
            session={session}
            onBack={() => setPage("dashboard")}
            onPaymentCreated={openPayment}
          />
        )}

        {page === "payment-details" && selectedPaymentId && (
          <PaymentDetails
            session={session}
            paymentId={selectedPaymentId}
            onBack={() => setPage("dashboard")}
            onOpenReceipt={openReceipt}
          />
        )}

        {page === "payment-history" && (
          <PaymentHistory
            session={session}
            onBack={() => setPage("dashboard")}
            onOpenPayment={openPayment}
            onOpenReceipt={openReceipt}
          />
        )}

        {page === "receipt" && selectedPaymentId && (
          <Receipt
            session={session}
            paymentId={selectedPaymentId}
            onBack={() => setPage("dashboard")}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default App;
