import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="navbar">
        <Link to="/" className="navbar-brand">
          HELPDESK
        </Link>
        <nav className="navbar-links">
          <Link to="/">Tickets</Link>
          <Link to="/tickets/new">New Ticket</Link>
        </nav>
        <div className="navbar-user">
          <span>
            {user?.displayName} <span className="muted">({user?.roles.join(', ')})</span>
          </span>
          <button type="button" onClick={logout} className="button-secondary">
            Log out
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
