import { useAuth } from "../context/AuthContext.jsx";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.h1}>Profile</h1>
        <p className={styles.sub}>Session-bound identity for this demo environment.</p>
      </header>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.k}>Name</span>
          <span className={styles.v}>{user?.full_name}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.k}>Email</span>
          <span className={styles.v}>{user?.email}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.k}>Balance</span>
          <span className={styles.v}>
            ₹{Number(user?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
