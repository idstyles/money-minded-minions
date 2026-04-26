import React, { useState, useEffect } from "react";

const API = process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

const CATEGORY_ICONS = {
  Food: "🍔", Transport: "🚗", Shopping: "🛍️",
  Entertainment: "🎬", Utilities: "💡", "Rent/EMI": "🏠", Other: "📦",
};

function healthClass(health) {
  if (!health) return "";
  const h = health.toLowerCase();
  if (h === "healthy") return "badge-approved";
  if (h === "tight") return "badge-pending";
  return "badge-rejected";
}

function HistoryProgressBar({ spent, budget }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const isOver = spent > budget;
  return (
    <div className="hist-progress-wrap">
      <div className="hist-progress-track">
        <div
          className={`hist-progress-fill ${isOver ? "hist-fill-over" : "hist-fill-ok"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="hist-progress-pct">{pct}%</span>
    </div>
  );
}

function CategoryMiniBar({ cl }) {
  const pct = cl.limit > 0 ? Math.min(100, Math.round((cl.spent / cl.limit) * 100)) : 0;
  const isOver = cl.spent > cl.limit;
  return (
    <div className="hist-cat-row">
      <span className="hist-cat-icon">{CATEGORY_ICONS[cl.category] || "📦"}</span>
      <span className="hist-cat-name">{cl.category}</span>
      <div className="hist-cat-bar-track">
        <div
          className={`hist-cat-bar-fill ${isOver ? "hist-fill-over" : "hist-fill-ok"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`hist-cat-pct ${isOver ? "text-danger" : "text-muted"}`}>{pct}%</span>
      <span className="hist-cat-amounts">₹{cl.spent.toLocaleString()}<span className="text-muted">/₹{cl.limit.toLocaleString()}</span></span>
    </div>
  );
}

export default function BudgetHistoryTab({ token }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedExpenses, setExpandedExpenses] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    fetch(`${API}/budgets/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.budgets) setBudgets(data.budgets);
        else setError("Failed to load history");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [token]);

  function toggleExpenses(id) {
    setExpandedExpenses((p) => ({ ...p, [id]: !p[id] }));
  }
  function toggleCategories(id) {
    setExpandedCategories((p) => ({ ...p, [id]: !p[id] }));
  }

  if (loading) return (
    <div className="hist-loading">
      <span className="hist-loading-icon">🍌</span>
      <p>Loading your budget history…</p>
    </div>
  );
  if (error) return <div className="alert alert-error">{error}</div>;
  if (budgets.length === 0) return (
    <div className="hist-empty">
      <span className="hist-empty-icon">🍌</span>
      <p>No budget history yet.</p>
      <span className="text-muted">Create your first budget to start tracking!</span>
    </div>
  );

  const totalSpentAll = budgets.reduce((s, b) => s + (b.totalSpent || 0), 0);
  const totalBudgetAll = budgets.reduce((s, b) => s + (b.monthlyBudget || 0), 0);
  const healthyCount = budgets.filter((b) => b.budgetHealth?.toLowerCase() === "healthy").length;

  return (
    <div className="hist-root">
      {/* Summary strip */}
      <div className="hist-summary-strip">
        <div className="hist-summary-item">
          <span className="hist-summary-num">{budgets.length}</span>
          <span className="hist-summary-label">Months tracked</span>
        </div>
        <div className="hist-summary-divider" />
        <div className="hist-summary-item">
          <span className="hist-summary-num">₹{totalSpentAll.toLocaleString("en-IN")}</span>
          <span className="hist-summary-label">Total spent</span>
        </div>
        <div className="hist-summary-divider" />
        <div className="hist-summary-item">
          <span className="hist-summary-num">₹{totalBudgetAll.toLocaleString("en-IN")}</span>
          <span className="hist-summary-label">Total budgeted</span>
        </div>
        <div className="hist-summary-divider" />
        <div className="hist-summary-item">
          <span className="hist-summary-num">{healthyCount}/{budgets.length}</span>
          <span className="hist-summary-label">Healthy months</span>
        </div>
      </div>

      {/* Budget cards */}
      <div className="hist-cards">
        {budgets.map((b) => {
          const pct = b.monthlyBudget ? Math.min(100, Math.round((b.totalSpent / b.monthlyBudget) * 100)) : 0;
          const remaining = b.remainingBudget ?? (b.monthlyBudget - b.totalSpent);
          const isOver = remaining < 0;
          const showExpenses = expandedExpenses[b._id];
          const showCategories = expandedCategories[b._id];
          const hasCats = b.categoryLimits?.length > 0;
          const monthLabel = new Date(b.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

          return (
            <div key={b._id} className={`hist-card ${b.budgetHealth?.toLowerCase() === "critical" ? "hist-card-critical" : ""}`}>
              {/* Card header */}
              <div className="hist-card-header">
                <div className="hist-card-title-row">
                  <div className="hist-card-month">
                    <span className="hist-month-icon">🍌</span>
                    <span className="hist-month-text">{monthLabel}</span>
                  </div>
                  <span className={`badge ${healthClass(b.budgetHealth)} badge-lg`}>{b.budgetHealth}</span>
                </div>

                {/* Large amount display */}
                <div className="hist-amounts-row">
                  <div className="hist-spent-block">
                    <span className="hist-spent-val">₹{b.totalSpent?.toLocaleString("en-IN")}</span>
                    <span className="hist-spent-label">spent</span>
                  </div>
                  <div className="hist-budget-block">
                    <span className="hist-budget-val">₹{b.monthlyBudget?.toLocaleString("en-IN")}</span>
                    <span className="hist-budget-label">budget</span>
                  </div>
                  <div className={`hist-remaining-block ${isOver ? "hist-remaining-over" : "hist-remaining-ok"}`}>
                    <span className="hist-remaining-val">{isOver ? "−" : "+"}₹{Math.abs(remaining).toLocaleString("en-IN")}</span>
                    <span className="hist-remaining-label">{isOver ? "over budget" : "remaining"}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <HistoryProgressBar spent={b.totalSpent} budget={b.monthlyBudget} />
                <div className="hist-pct-label">{pct}% of monthly budget used</div>
              </div>

              {/* AI Advice */}
              {b.aiAdvice?.advice && (
                <div className="hist-advice-row">
                  <span className="hist-advice-icon">💡</span>
                  <p className="hist-advice-text">{b.aiAdvice.advice}</p>
                </div>
              )}

              {/* Category breakdown toggle */}
              {hasCats && (
                <div className="hist-section">
                  <button className="hist-toggle-btn" onClick={() => toggleCategories(b._id)}>
                    <span>📊 Category Breakdown</span>
                    <span className="hist-toggle-arrow">{showCategories ? "▲" : "▼"}</span>
                  </button>
                  {showCategories && (
                    <div className="hist-cat-list">
                      {b.categoryLimits.map((cl) => (
                        <CategoryMiniBar key={cl.category} cl={cl} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Expenses toggle */}
              {b.expenses?.length > 0 && (
                <div className="hist-section">
                  <button className="hist-toggle-btn" onClick={() => toggleExpenses(b._id)}>
                    <span>📋 {b.expenses.length} Expenses</span>
                    <span className="hist-toggle-arrow">{showExpenses ? "▲" : "▼"}</span>
                  </button>
                  {showExpenses && (
                    <div className="hist-expense-list">
                      {[...b.expenses].reverse().map((exp, i) => (
                        <div key={exp._id || i} className="hist-exp-row">
                          <span className="hist-exp-icon">{CATEGORY_ICONS[exp.category] || "📦"}</span>
                          <span className="hist-exp-cat">{exp.category}</span>
                          <span className={`badge ${exp.isMandatory ? "badge-approved" : "badge-pending"} badge-xs`}>
                            {exp.isMandatory ? "Essential" : "Optional"}
                          </span>
                          <span className="hist-exp-date text-muted">
                            {new Date(exp.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                          <span className="hist-exp-amt">−₹{exp.amount.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
