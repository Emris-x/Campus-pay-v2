export default function Navbar({
  onDashboard,
  onCourseRegistration,
  onHistory,
  onSignOut
}) {
  return (
    <nav className="navbar">
      <button
        type="button"
        className="navbar-brand"
        onClick={onDashboard}
      >
        Campus Pay
      </button>

      <div className="navbar-links">
        <button type="button" onClick={onDashboard}>
          Dashboard
        </button>

        <button type="button" onClick={onCourseRegistration}>
          Course Registration
        </button>

        <button type="button" onClick={onHistory}>
          Payment History
        </button>

        <button type="button" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
