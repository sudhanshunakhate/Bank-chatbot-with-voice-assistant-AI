import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./AppLayout.module.css";

const nav = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transactions", label: "Transactions" },
  { to: "/expenses", label: "Expenses" },
  { to: "/advisor", label: "AI Advisor" },
  { to: "/profile", label: "Profile" },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <svg className={styles.logoSvg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2zm0 4l6.5 13H5.5L12 6z" fill="var(--gold)" />
            <circle cx="12" cy="13" r="2.5" fill="var(--accent)" />
          </svg>
          <div>
            <div className={styles.brandTitle}>APEX HORIZON</div>
            <div className={styles.brandSub}>Premium Bank</div>
          </div>
        </div>
        <div className={styles.mlStatus}>
          <span className={styles.pulseDot}></span>
          <span>AI CORE ADAPTIVE</span>
        </div>
        <nav className={styles.nav}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? styles.navActive : styles.navLink)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.userCard}>
          <div className={styles.userName}>{user?.full_name}</div>
          <div className={styles.userEmail}>{user?.email}</div>
          <button type="button" className={styles.logout} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
