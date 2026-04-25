import { useState, useEffect, useRef } from "react";
import "./App.css";
import AuthPage from "./AuthPage";

const API = "http://localhost:5000";

const CATEGORY_ICONS = {
  Food: "🍔", Transport: "🚗", Shopping: "🛍️",
  Entertainment: "🎬", Utilities: "💡", "Rent/EMI": "🏠", Other: "📦",
};

const HEALTH_MAP = { Healthy: "Normal", Tight: "Warning", Critical: "Overspending" };
const REC_MAP    = { Proceed: "Normal", Reconsider: "Warning", Avoid: "Overspending" };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function authHeaders() {
  const t = localStorage.getItem("mmm_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
}

export default function App() {
  const [token, setToken]   = useState(localStorage.getItem("mmm_token"));
  const [user, setUser]     = useState(JSON.parse(localStorage.getItem("mmm_user") || "null"));
  const [view, setView]     = useState("loading");
  const [budget, setBudget] = useState(null);

  // Budget creation form
  const [monthlyAmt, setMonthlyAmt]     = useState("");
  const [initExpenses, setInitExpenses] = useState([]);
  const [creating, setCreating]         = useState(false);

  // Add-expense form
  const [expAmt, setExpAmt]         = useState("");
  const [expCat, setExpCat]         = useState("Food");
  const [expMand, setExpMand]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Chat
  const [chatHistory, setChatHistory] = useState([
    { role: "agent", content: "Hi! I'm your finance co-pilot. Ask me anything about your budget, spending habits, or ways to save." },
  ]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!token) { setView("auth"); return; }
    fetchBudget();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  async function fetchBudget() {
    try {
      const res = await fetch(`${API}/budget`, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      if (data.budget) {
        setBudget(data.budget);
        setView("dashboard");
      } else {
        setView("create-budget");
      }
    } catch {
      setView("create-budget");
    }
  }

  async function handleAuth(newToken, newUser) {
    localStorage.setItem("mmm_token", newToken);
    localStorage.setItem("mmm_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    try {
      const res = await fetch(`${API}/budget`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${newToken}` },
      });
      const data = await res.json();
      if (data.budget) {
        setBudget(data.budget);
        setView("dashboard");
      } else {
        setView("create-budget");
      }
    } catch {
      setView("create-budget");
    }
  }

  function logout() {
    localStorage.removeItem("mmm_token");
    localStorage.removeItem("mmm_user");
    setToken(null);
    setUser(null);
    setBudget(null);
    setView("auth");
  }

  function startNewBudget() {
    setMonthlyAmt("");
    setInitExpenses([]);
    setView("create-budget");
  }

  // ─── Init expenses helpers ─────────────────────────────────

  function addInitRow() {
    setInitExpenses((p) => [...p, { amount: "", category: "Rent/EMI", isMandatory: true }]);
  }

  function removeInitRow(i) {
    setInitExpenses((p) => p.filter((_, idx) => idx !== i));
  }

  function updateInitRow(i, field, value) {
    setInitExpenses((p) => p.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  }

  // ─── API actions ───────────────────────────────────────────

  async function createBudget() {
    if (!monthlyAmt) return;
    setCreating(true);
    try {
      const expenses = initExpenses
        .filter((e) => e.amount && Number(e.amount) > 0)
        .map((e) => ({ amount: Number(e.amount), category: e.category, isMandatory: e.isMandatory }));

      const res = await fetch(`${API}/create-budget`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ monthlyBudget: Number(monthlyAmt), expenses }),
      });
      const data = await res.json();
      if (data.success) {
        setBudget(data.budget);
        setView("dashboard");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function addExpense() {
    if (!expAmt || !budget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/add-expense`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          id: budget._id,
          expense: { amount: Number(expAmt), category: expCat, isMandatory: expMand },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBudget(data.budget);
        setExpAmt("");
        setExpMand(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg = { role: "user", content: text };
    setChatHistory((h) => [...h, userMsg]);
    setChatInput("");
    setChatLoading(true);

    const context = budget
      ? {
          monthlyBudget: budget.monthlyBudget,
          totalSpent: budget.totalSpent,
          remainingBudget: budget.remainingBudget,
          budgetHealth: budget.budgetHealth,
          lastAdvice: budget.aiAdvice?.advice,
        }
      : null;

    const apiMessages = [...chatHistory, userMsg]
      .filter((m, i) => !(m.role === "agent" && i === 0))
      .map((m) => ({ role: m.role === "agent" ? "assistant" : m.role, content: m.content }));

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ messages: apiMessages, context }),
      });
      const data = await res.json();
      setChatHistory((h) => [
        ...h,
        {
          role: "agent",
          content: data.success ? data.reply : "Sorry, I ran into an issue. Please try again.",
        },
      ]);
    } catch {
      setChatHistory((h) => [
        ...h,
        { role: "agent", content: "Connection error. Make sure the backend is running." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────

  if (view === "loading") {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (view === "auth") {
    return <AuthPage onAuth={handleAuth} />;
  }

  const Header = () => (
    <header className="app-header">
      <span className="logo">💰</span>
      <div>
        <h1>Money Minded Minions</h1>
        <p>Smart budgeting with AI co-pilot</p>
      </div>
      <div className="header-right">
        <span className="user-name">👤 {user?.name}</span>
        {view === "dashboard" && (
          <button className="btn-secondary btn-sm" onClick={startNewBudget}>
            New Budget
          </button>
        )}
        <button className="btn-logout" onClick={logout}>
          Sign Out
        </button>
      </div>
    </header>
  );

  if (view === "create-budget") {
    return (
      <div className="app">
        <Header />
        <div className="setup-container">
          <div className="card setup-card">
            <div className="card-title">Set Up Your Monthly Budget</div>
            <p className="setup-desc">
              Enter your monthly budget to get started. Add any known fixed expenses
              (rent, EMIs) for more accurate AI insights.
            </p>

            <input
              className="setup-input"
              type="number"
              placeholder="Monthly Budget (₹)"
              value={monthlyAmt}
              onChange={(e) => setMonthlyAmt(e.target.value)}
            />

            <div className="init-expenses-header">
              <span className="card-subtitle">Initial Expenses</span>
              <button className="btn-secondary btn-sm" onClick={addInitRow}>
                + Add
              </button>
            </div>
            <p className="setup-hint">Optional — add recurring expenses you already know about.</p>

            {initExpenses.map((exp, i) => (
              <div className="init-expense-row" key={i}>
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={exp.amount}
                  onChange={(e) => updateInitRow(i, "amount", e.target.value)}
                />
                <select
                  value={exp.category}
                  onChange={(e) => updateInitRow(i, "category", e.target.value)}
                >
                  {Object.keys(CATEGORY_ICONS).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_ICONS[c]} {c}
                    </option>
                  ))}
                </select>
                <label className="mandatory-toggle">
                  <input
                    type="checkbox"
                    checked={exp.isMandatory}
                    onChange={(e) => updateInitRow(i, "isMandatory", e.target.checked)}
                  />
                  Essential
                </label>
                <button className="btn-remove" onClick={() => removeInitRow(i)}>
                  ✕
                </button>
              </div>
            ))}

            <button
              className="btn-primary"
              onClick={createBudget}
              disabled={creating || !monthlyAmt}
            >
              {creating ? "Analyzing with AI…" : "Create Budget"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  const pct         = budget ? Math.min((budget.totalSpent / budget.monthlyBudget) * 100, 100) : 0;
  const statusClass = HEALTH_MAP[budget?.budgetHealth] || "Normal";
  const recClass    = REC_MAP[budget?.aiAdvice?.recommendation] || "Normal";

  return (
    <div className="app">
      <Header />

      <div className="main-grid">
        {/* ── Left column ── */}
        <div>
          {/* Budget summary */}
          <div className="card budget-card">
            <div className="card-title">Monthly Budget</div>
            <div className="budget-summary">
              <div>
                <div className="spent-label">
                  ₹{budget.totalSpent.toLocaleString("en-IN")}
                </div>
                <div className="budget-label">
                  of ₹{budget.monthlyBudget.toLocaleString("en-IN")} spent
                </div>
              </div>
              <span className={`status-badge ${statusClass}`}>{budget.budgetHealth}</span>
            </div>
            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill ${statusClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="progress-pct">
              {pct.toFixed(1)}% used · ₹{budget.remainingBudget.toLocaleString("en-IN")} remaining
            </div>
          </div>

          {/* AI Advice */}
          {budget?.aiAdvice?.advice && (
            <div className="ai-advice-card card">
              <div className="ai-advice-header">
                <span className="ai-advice-label">✨ AI Advice</span>
                <span className={`status-badge ${recClass}`}>
                  {budget.aiAdvice.recommendation}
                </span>
              </div>
              <p className="ai-explanation">{budget.aiAdvice.advice}</p>
            </div>
          )}

          {/* Add Expense */}
          <div className="card expense-form">
            <div className="card-title">Add Expense</div>
            <div className="form-row">
              <input
                type="number"
                placeholder="Amount (₹)"
                value={expAmt}
                onChange={(e) => setExpAmt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExpense()}
              />
              <select value={expCat} onChange={(e) => setExpCat(e.target.value)}>
                {Object.keys(CATEGORY_ICONS).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_ICONS[c]} {c}
                  </option>
                ))}
              </select>
            </div>
            <label className="mandatory-toggle">
              <input
                type="checkbox"
                checked={expMand}
                onChange={(e) => setExpMand(e.target.checked)}
              />
              Essential expense (rent, bills, EMI…)
            </label>
            <button
              className="btn-primary"
              onClick={addExpense}
              disabled={submitting || !expAmt}
            >
              {submitting ? "Analyzing…" : "Add & Analyze"}
            </button>
          </div>

          {/* Transactions */}
          <div className="card transaction-list">
            <div className="card-title">Transactions</div>
            {!budget.expenses?.length && (
              <div className="empty-state">No transactions yet. Add your first expense above.</div>
            )}
            {[...budget.expenses].reverse().slice(0, 10).map((tx) => (
              <div className="transaction-item" key={tx._id}>
                <div className="tx-left">
                  <div className="tx-icon">{CATEGORY_ICONS[tx.category] || "📦"}</div>
                  <div>
                    <div className="tx-category">
                      {tx.category}
                      {tx.isMandatory && (
                        <span className="mandatory-badge">Essential</span>
                      )}
                    </div>
                    <div className="tx-date">{formatDate(tx.createdAt)}</div>
                  </div>
                </div>
                <div className="tx-amount">−₹{tx.amount.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Co-pilot panel ── */}
        <div className="card copilot-panel">
          <div className="copilot-header">
            <div className="pulse" />
            <h2>AI Co-pilot</h2>
            <span className="model-tag">Azure OpenAI</span>
          </div>

          <div className="chat-messages">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {chatLoading && <div className="msg typing">Co-pilot is thinking…</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              placeholder="Ask about your spending…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              disabled={chatLoading}
            />
            <button
              className="btn-send"
              onClick={sendChat}
              disabled={chatLoading || !chatInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
