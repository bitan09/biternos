import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

const NAV_ITEMS = [
  { to: "/dashboard", label: "My Servers", icon: "🖥" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar__brand">
          <Logo withWordmark />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
          {user?.role === "ADMIN" && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
              <span>🛡</span> Admin Panel
            </NavLink>
          )}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
          <div className="flex-between" style={{ padding: "6px 10px" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.username}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{user?.role === "ADMIN" ? "Administrator" : "Player"}</div>
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" style={{ width: "100%", marginTop: 6 }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div>
        <div className="topbar">
          <button className="btn btn--ghost btn--icon" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle menu">
            ☰
          </button>
          <Logo />
          <NotificationBell />
        </div>

        <main className="main-content">
          <div className="flex-between mb-16" style={{ minHeight: 32 }}>
            <div />
            <NotificationBell />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
