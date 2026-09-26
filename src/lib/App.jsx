import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="app-loading">Loading Campus Pay...</div>;
  }

  return (
    <main className="app-shell">
      {session ? (
        <section>
          <h1>Campus Pay</h1>
          <p>Welcome back.</p>
        </section>
      ) : (
        <section>
          <h1>Campus Pay</h1>
          <p>Your payment assistant for UNICAL.</p>
        </section>
      )}
    </main>
  );
}

export default App;
