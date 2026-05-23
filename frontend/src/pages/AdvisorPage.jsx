import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import styles from "./AdvisorPage.module.css";

const CHIPS = [
  "What is my balance?",
  "Show my transactions",
  "How can I save money?",
  "Am I overspending?",
  "Log expense 120 groceries",
  "About Apex Horizon Bank",
  "Helpline & branch locations",
  "Interest rates & credit cards",
  "Was my account hacked?"
];

const INTENTS = [
  { value: "check_balance", label: "Check Balance" },
  { value: "show_transactions", label: "Show Transactions" },
  { value: "transfer_money", label: "Transfer Money" },
  { value: "spending_insight", label: "Spending Insights" },
  { value: "savings_advice", label: "Savings Advice" },
  { value: "fraud_concern", label: "Fraud Alert Concern" },
  { value: "add_expense", label: "Log Expense" },
  { value: "bank_info", label: "Bank Information" },
  { value: "annual_projection", label: "Annual Projection" },
  { value: "show_transfers", label: "Show Transfers" },
  { value: "general_query", label: "General Query" }
];

export function AdvisorPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to the Apex Horizon AI Hub. I am your adaptive financial coach. Ask me about your balance, transaction history, savings advice, or flag unusual charges.",
      intent: null,
      data: null
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  
  // Model status states
  const [mlStatus, setMlStatus] = useState(null);
  
  // Feedback correction states
  const [lastUserText, setLastUserText] = useState("");
  const [lastDetectedIntent, setLastDetectedIntent] = useState("");
  const [correctedIntent, setCorrectedIntent] = useState("general_query");

  const endRef = useRef(null);

  // Fetch ML Model status
  async function fetchMlStatus() {
    try {
      const { data } = await api.get("/chat/model-status");
      setMlStatus(data);
    } catch (e) {
      console.error("Could not fetch model status", e);
    }
  }

  useEffect(() => {
    fetchMlStatus();
  }, []);

  async function send(overrideText = null) {
    const text = (overrideText || input).trim();
    if (!text || busy) return;
    if (!overrideText) setInput("");
    
    // Add user message
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    setLastUserText(text);

    try {
      const { data } = await api.post("/chat", { message: text });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply, intent: data.intent, data: data.data },
      ]);
      if (data.intent) {
        setLastDetectedIntent(data.intent);
        setCorrectedIntent(data.intent);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Unable to contact Apex Horizon core. Please verify your connection." },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
      fetchMlStatus(); // Refresh ML stats
    }
  }

  // Submit Feedback Correction
  async function submitCorrection() {
    if (!lastUserText) return;
    try {
      await api.post("/chat/feedback", {
        text: lastUserText,
        intent: correctedIntent
      });
      
      // Append confirmation message to chat
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `[SYSTEM STATUS] ML Model trained dynamically on user correction:\nQuery: "${lastUserText}" \nIntent: ${correctedIntent}.\nModel classification layers updated in memory instantly.`,
          isSystem: true
        }
      ]);
      
      setLastUserText("");
      setLastDetectedIntent("");
      fetchMlStatus(); // Refresh stats
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      console.error("Failed to train model correction", e);
    }
  }

  // Voice recording simulation
  function startVoiceInput() {
    if (busy || listening) return;
    setListening(true);
    
    // Simulate voice recording for 2.5 seconds, then submit a random query
    setTimeout(() => {
      const randomQuery = CHIPS[Math.floor(Math.random() * CHIPS.length)];
      setListening(false);
      send(randomQuery);
    }, 2500);
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        text: "Welcome to the Apex Horizon AI Hub. I am your adaptive financial coach. Ask me about your balance, transaction history, savings advice, or flag unusual charges.",
        intent: null,
        data: null
      },
    ]);
    setLastUserText("");
    setLastDetectedIntent("");
    setInput("");
  }

  return (
    <div className={styles.page}>
      {/* Left Chat Column */}
      <div className={styles.chatSection}>
        <header className={styles.head}>
          <div className={styles.headTop}>
            <h1 className={styles.h1}>Apex Intelligence Hub</h1>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearChat}
              title="Clear entire chat history"
            >
              🧹 Clear Chat
            </button>
          </div>
          <p className={styles.sub}>
            Adaptive AI intent mapping backed by your live account and scikit-learn training modules.
          </p>
        </header>

        <div className={styles.chat}>
          {listening && (
            <div className={styles.voiceWaveform}>
              <div className={styles.waveLines}>
                <div className={styles.waveLine}></div>
                <div className={styles.waveLine}></div>
                <div className={styles.waveLine}></div>
                <div className={styles.waveLine}></div>
                <div className={styles.waveLine}></div>
                <div className={styles.waveLine}></div>
              </div>
              <div style={{ color: "var(--gold)", fontWeight: 700, fontSize: "0.9rem" }}>Listening to Voice Commands...</div>
            </div>
          )}

          <div className={styles.thread}>
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
                <div className={msg.role === "user" ? styles.metaUser : styles.meta}>
                  {msg.role === "user" ? "You" : msg.isSystem ? "System Update" : "Apex Advisor"}
                </div>
                <div className={styles.text}>{msg.text}</div>
                
                {/* Conditional Rich Cards */}
                {msg.role === "assistant" && msg.intent === "check_balance" && msg.data?.balance != null && (
                  <div className={styles.botCard}>
                    <div className={styles.botCardTitle}>APEX VISA PLATINUM BALANCE</div>
                    <div className={styles.botCardBalance}>
                      ₹{Number(msg.data.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={styles.botCardFooter}>Active Account • Apex Horizon Bank</div>
                  </div>
                )}

                {msg.role === "assistant" && msg.intent === "show_transactions" && Array.isArray(msg.data?.transactions) && (
                  <div className={styles.botTxTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msg.data.transactions.map((t) => (
                          <tr key={t.id}>
                            <td>{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                            <td style={{ textTransform: "capitalize" }}>{t.type.replace("_", " ")}</td>
                            <td className={t.type.includes("out") || t.type === "expense" || t.type === "withdraw" ? styles.txRed : styles.txGreen}>
                              ₹{t.amount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {msg.role === "assistant" && msg.intent === "fraud_concern" && (
                  <div className={styles.botAlertCard}>
                    <div className={styles.botAlertHeader}>
                      <span>⚠️</span> SYSTEM SECURITY ADVISORY
                    </div>
                    <div className={styles.botAlertBody}>
                      Apex Horizon security protocols flagged unusual transaction behavior. Review your logs.
                    </div>
                    <div className={styles.botAlertActions}>
                      <button type="button" className={styles.alertBtnDanger} onClick={() => alert("Simulated Card Freeze Active")}>Freeze Card</button>
                      <button type="button" className={styles.alertBtnGhost} onClick={() => alert("Flagged items dismissed")}>Dismiss Alert</button>
                    </div>
                  </div>
                )}

                {msg.role === "assistant" && msg.intent === "spending_insight" && msg.data?.by_category && (
                  <div className={styles.botInsightCard}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.5rem" }}>
                      CATEGORY EXPENDITURE BREAKDOWN
                    </div>
                    {Object.entries(msg.data.by_category).map(([cat, amt]) => {
                      const total = Object.values(msg.data.by_category).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (amt / total) * 100 : 0;
                      return (
                        <div key={cat} className={styles.insightBarRow}>
                          <div className={styles.insightBarLabel}>{cat}</div>
                          <div className={styles.insightBarContainer}>
                            <div className={styles.insightBarFill} style={{ width: `${pct}%` }}></div>
                          </div>
                          <div className={styles.insightBarValue}>₹{amt.toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {msg.role === "assistant" && msg.intent === "annual_projection" && msg.data?.projected_annual != null && (
                  <div className={styles.botInsightCard} style={{ background: "rgba(226, 183, 101, 0.04)", borderColor: "rgba(226, 183, 101, 0.3)" }}>
                    <div className={styles.botCardTitle} style={{ color: "var(--gold)" }}>ANNUAL SPENDING FORECAST</div>
                    <div className={styles.botCardBalance} style={{ color: "var(--text)", margin: "0.25rem 0" }}>
                      ₹{Number(msg.data.projected_annual).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                      Estimated based on monthly run rate of ₹{Number(msg.data.monthly_spending).toLocaleString("en-IN")}
                    </div>
                    {msg.data.breakdown && Object.entries(msg.data.breakdown).map(([cat, amt]) => {
                      const total = msg.data.projected_annual;
                      const pct = total > 0 ? (amt / total) * 100 : 0;
                      return (
                        <div key={cat} className={styles.insightBarRow}>
                          <div className={styles.insightBarLabel}>{cat}</div>
                          <div className={styles.insightBarContainer}>
                            <div className={styles.insightBarFill} style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--gold) 0%, var(--accent-2) 100%)" }}></div>
                          </div>
                          <div className={styles.insightBarValue}>₹{amt.toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {msg.role === "assistant" && msg.intent === "show_transfers" && Array.isArray(msg.data?.transfers) && (
                  <div className={styles.botTxTable}>
                    <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "0.75rem", fontWeight: 700, color: "var(--gold)" }}>
                      RECORDED MONEY TRANSFERS
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Recipient</th>
                          <th>Date</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msg.data.transfers.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: "var(--text)" }}>{t.recipient_name}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{t.recipient_email}</div>
                            </td>
                            <td>{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                            <td className={styles.txRed}>
                              ₹{t.amount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Prompt Suggestion Chips */}
          <div className={styles.chips}>
            {CHIPS.map((chip, i) => (
              <button
                key={i}
                type="button"
                className={styles.chip}
                onClick={() => send(chip)}
                disabled={busy}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Composer Input Box */}
          <div className={styles.composer}>
            <button
              type="button"
              className={`${styles.micBtn} ${listening ? styles.micBtnActive : ""}`}
              onClick={startVoiceInput}
              disabled={busy}
              title="Simulate Voice Command"
            >
              🎤
            </button>
            <input
              className={styles.input}
              placeholder="Ask Apex AI: e.g. What is my balance?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={busy}
            />
            <button
              type="button"
              className={styles.send}
              onClick={() => send()}
              disabled={busy || !input.trim()}
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* Right AI Learning Hub Panel */}
      <aside className={styles.learningHub}>
        <h2 className={styles.hubTitle}>
          <span className={styles.hubTitleIcon}>⚙️</span> AI Training Hub
        </h2>

        <div className={styles.hubSection}>
          <h3 className={styles.hubSectionH3}>ML Classifier Status</h3>
          <div className={styles.hubGrid}>
            <div className={styles.hubStatCard}>
              <div className={styles.hubStatLabel}>Baseline Size</div>
              <div className={styles.hubStatVal}>{mlStatus?.baseline_count ?? 38}</div>
            </div>
            <div className={styles.hubStatCard}>
              <div className={styles.hubStatLabel}>User Feedback</div>
              <div className={styles.hubStatVal}>{mlStatus?.feedback_count ?? 0}</div>
            </div>
          </div>
        </div>

        {lastUserText && (
          <div className={styles.hubSection}>
            <h3 className={styles.hubSectionH3}>Correct Last Query</h3>
            <div className={styles.feedbackCorrectCard}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Your query:</div>
              <div className={styles.feedbackLastMsg}>"{lastUserText}"</div>
              
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                Classified: <span style={{ color: "var(--accent-2)", fontWeight: 700 }}>{lastDetectedIntent}</span>
              </div>
              
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                Select Correct Intent:
              </div>
              <select
                className={styles.feedbackSelect}
                value={correctedIntent}
                onChange={(e) => setCorrectedIntent(e.target.value)}
              >
                {INTENTS.map((intent) => (
                  <option key={intent.value} value={intent.value}>
                    {intent.label}
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                className={styles.feedbackBtn}
                onClick={submitCorrection}
              >
                Train Model Instantly
              </button>
            </div>
          </div>
        )}

        <div className={styles.hubSection} style={{ flex: 1 }}>
          <h3 className={styles.hubSectionH3}>Recent Corrections Log</h3>
          <div className={styles.recentFeedbackList}>
            {mlStatus?.recent_feedback?.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: "1rem" }}>
                No custom user feedback recorded in SQLite yet.
              </div>
            ) : (
              mlStatus?.recent_feedback?.map((item) => (
                <div key={item.id} className={styles.feedbackItem}>
                  <div className={styles.feedbackItemQuery}>"{item.text}"</div>
                  <div className={styles.feedbackItemIntent}>{item.intent}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

