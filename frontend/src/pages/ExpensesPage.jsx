import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./Tables.module.css";

const PRESET = ["food", "rent", "travel", "utilities", "subscriptions", "health", "other"];

export function ExpensesPage() {
  const { refreshUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [customCat, setCustomCat] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/expenses");
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch(() => setErr("Failed to load expenses."));
  }, [load]);

  async function onAdd(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const cat = category === "other" ? customCat.trim() : category;
    if (!cat) {
      setErr("Enter a category.");
      return;
    }
    try {
      await api.post("/expenses", {
        amount: Number(amount),
        category: cat,
        description: description || null,
      });
      setAmount("");
      setDescription("");
      setMsg("Expense recorded.");
      await load();
      await refreshUser();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Could not add expense.");
    }
  }

  return (
    <div>
      <header className={styles.pageHead}>
        <h1 className={styles.h1}>Expenses</h1>
        <p className={styles.lead}>Categorized spending powers the dashboard and AI insights.</p>
      </header>

      {(msg || err) && (
        <div className={err ? styles.bannerErr : styles.bannerOk}>{err || msg}</div>
      )}

      <form className={styles.card} onSubmit={onAdd} style={{ marginBottom: "1.25rem" }}>
        <h2 className={styles.h2}>Add expense</h2>
        <div className={styles.row}>
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
          <label className={styles.label}>
            Category
            <select className={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
              {PRESET.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        {category === "other" && (
          <label className={styles.label}>
            Custom category
            <input className={styles.input} value={customCat} onChange={(e) => setCustomCat(e.target.value)} />
          </label>
        )}
        <label className={styles.label}>
          Note (optional)
          <input className={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button type="submit" className={styles.btn}>
          Save expense
        </button>
      </form>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.category}</td>
                <td>₹{Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td>{r.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>No expenses logged.</p>}
      </div>
    </div>
  );
}
