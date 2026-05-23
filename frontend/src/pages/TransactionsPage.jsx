import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./Tables.module.css";

export function TransactionsPage() {
  const { refreshUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [amount, setAmount] = useState("");
  const [dwType, setDwType] = useState("deposit");
  const [toEmail, setToEmail] = useState("");
  const [xferAmt, setXferAmt] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/transactions");
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch(() => setErr("Failed to load transactions."));
  }, [load]);

  async function onDepositWithdraw(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/transactions/deposit-withdraw", {
        amount: Number(amount),
        type: dwType,
      });
      setAmount("");
      setMsg("Updated successfully.");
      await load();
      await refreshUser();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Request failed.");
    }
  }

  async function onTransfer(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/transactions/transfer", {
        to_email: toEmail,
        amount: Number(xferAmt),
      });
      setToEmail("");
      setXferAmt("");
      setMsg("Transfer completed.");
      await load();
      await refreshUser();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Transfer failed.");
    }
  }

  return (
    <div>
      <header className={styles.pageHead}>
        <h1 className={styles.h1}>Transactions</h1>
        <p className={styles.lead}>Deposits, withdrawals, and peer transfers with anomaly flags.</p>
      </header>

      {(msg || err) && (
        <div className={err ? styles.bannerErr : styles.bannerOk}>
          {err || msg}
        </div>
      )}

      <div className={styles.split}>
        <form className={styles.card} onSubmit={onDepositWithdraw}>
          <h2 className={styles.h2}>Deposit / Withdraw</h2>
          <label className={styles.label}>
            Type
            <select className={styles.input} value={dwType} onChange={(e) => setDwType(e.target.value)}>
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
            </select>
          </label>
          <label className={styles.label}>
            Amount
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <button type="submit" className={styles.btn}>
            Submit
          </button>
        </form>

        <form className={styles.card} onSubmit={onTransfer}>
          <h2 className={styles.h2}>Transfer to user</h2>
          <p className={styles.hint}>Recipient must be registered with the same server.</p>
          <label className={styles.label}>
            Recipient email
            <input
              className={styles.input}
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Amount
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={xferAmt}
              onChange={(e) => setXferAmt(e.target.value)}
              required
            />
          </label>
          <button type="submit" className={styles.btn}>
            Send
          </button>
        </form>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.type}</td>
                <td>₹{Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td>{r.category || "—"}</td>
                <td>{r.anomaly_flag ? <span className={styles.badge}>Review</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>No transactions yet.</p>}
      </div>
    </div>
  );
}
