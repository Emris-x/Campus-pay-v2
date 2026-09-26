export default function ProtectedRoute({ children, session }) {
  if (!session) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <h1>Campus Pay</h1>
          <p>Please sign in to continue.</p>
        </div>
      </section>
    );
  }

  return children;
}
