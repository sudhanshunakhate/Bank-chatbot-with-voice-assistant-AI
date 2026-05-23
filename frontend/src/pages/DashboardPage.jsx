import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./DashboardPage.module.css";

const COLORS = ["#e2b765", "#6366f1", "#10b981", "#ec4899", "#f59e0b", "#8b5cf6"];

export function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [cats, setCats] = useState([]);
  const [mlStatus, setMlStatus] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [s, tr, br, ml] = await Promise.all([
          api.get("/account/summary"),
          api.get("/insights/spending-trend?days=30"),
          api.get("/insights/category-breakdown"),
          api.get("/chat/model-status").catch(() => ({ data: null })),
        ]);
        if (cancel) return;
        setSummary(s.data);
        setTrend(tr.data.series || []);
        setCats(br.data.items || []);
        if (ml && ml.data) setMlStatus(ml.data);
        await refreshUser();
      } catch {
        if (!cancel) setErr("Could not load dashboard data.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [refreshUser]);

  const delta =
    summary && summary.last_month_expenses > 0
      ? ((summary.this_month_expenses - summary.last_month_expenses) / summary.last_month_expenses) * 100
      : null;

  return (
    <div>
      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>Apex Horizon Portal</h1>
          <p className={styles.sub}>High-fidelity digital banking dashboard &amp; adaptive AI insights.</p>
        </div>
        <Link className={styles.cta} to="/advisor">
          Consult AI Advisor
        </Link>
      </header>

      {err && <p className={styles.err}>{err}</p>}

      <section className={styles.grid}>
        {/* Luxury Credit Card */}
        <div className={styles.visaCard}>
          <div className={styles.cardTop}>
            <div className={styles.cardBrandName}>APEX HORIZON</div>
            <div className={styles.cardType}>VISA</div>
          </div>
          <div className={styles.cardChip}></div>
          <div className={styles.cardVal}>
            ₹{Number(user?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className={styles.cardBottom}>
            <div>
              <div className={styles.cardHolder}>Cardholder</div>
              <div className={styles.cardName}>{user?.full_name || "VALUED CLIENT"}</div>
            </div>
            <div className={styles.cardHolder}>•••• 8842</div>
          </div>
        </div>

        {/* This Month Expenses */}
        <div className={styles.metricCard}>
          <div>
            <div className={styles.cardLabel}>Monthly Expenses</div>
            <div className={styles.cardValue}>
              ₹{Number(summary?.this_month_expenses ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className={styles.cardHint}>
            {delta != null && !Number.isNaN(delta) ? (
              <span style={{ color: delta >= 0 ? "var(--danger)" : "var(--accent)" }}>
                {delta >= 0 ? "▲ Increase " : "▼ Decrease "} {Math.abs(delta).toFixed(0)}% vs last month
              </span>
            ) : (
              "Log expenses to track month-over-month differences"
            )}
          </div>
        </div>

        {/* AI Financial Health Score */}
        <div className={styles.metricCard}>
          <div>
            <div className={styles.cardLabel}>AI Financial Health</div>
            <div className={styles.cardValue}>86 <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/ 100</span></div>
          </div>
          <div>
            <div className={styles.gaugeBar}>
              <div className={styles.gaugeFill} style={{ width: "86%" }}></div>
            </div>
            <div className={styles.cardHint}>
              AI Core Status: <span className={styles.healthValue}>ACTIVE &amp; ADAPTIVE</span>
            </div>
          </div>
        </div>

        {/* ML Engine Stats Card */}
        <div className={styles.metricCard}>
          <div>
            <div className={styles.cardLabel}>Dynamic ML Training Size</div>
            <div className={styles.cardValue}>
              {mlStatus ? mlStatus.baseline_count + mlStatus.feedback_count : 38}
              <span style={{ fontSize: "1rem", color: "var(--muted)" }}> samples</span>
            </div>
          </div>
          <div className={styles.cardHint}>
            Baseline: <span className={styles.mlHighlight}>{mlStatus?.baseline_count ?? 38}</span> | Corrections: <span className={styles.mlHighlight}>{mlStatus?.feedback_count ?? 0}</span>
          </div>
        </div>
      </section>

      <section className={styles.charts}>
        <div className={styles.panel}>
          <h2 className={styles.h2}>Expense trend</h2>
          <div className={styles.chartBox}>
            {trend.length === 0 ? (
              <p className={styles.empty}>No expense data in the last 30 days. Add expenses to see the curve.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "#fff" }}
                    formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Total"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--gold)" fill="url(#g1)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className={styles.panel}>
          <h2 className={styles.h2}>This month by category</h2>
          <div className={styles.chartBox}>
            {cats.length === 0 ? (
              <p className={styles.empty}>No categories yet. Categorize expenses for a rich breakdown.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={cats} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={88} label>
                    {cats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

