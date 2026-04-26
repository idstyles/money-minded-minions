import React, { useState, useEffect } from "react";

const API = process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

function healthClass(health) {
  if (!health) return "";
  const h = health.toLowerCase();
  if (h === "healthy") return "badge-approved";
  if (h === "tight") return "badge-pending";
  return "badge-rejected";
}

export default function BudgetHistoryTab({ token }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

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

  if (loading) return <div className="loading-state">Loading history…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (budgets.length === 0) return <div className="empty-state">No budget history yet.</div>;

  return (
    <div className="history-tab-content">
      {budgets.map((b) => {
        const isExpanded = expandedId === b._id;
        const pct = b.monthlyBudget ? Math.min(100, Math.round((b.totalSpent / b.monthlyBudget) * 100)) : 0;
        return (
          <div key={b._id} className="budget-history-card">
            <div className="budget-history-header">
              <div className="budget-history-meta">
                <span className="budget-history-date">
                  {new Date(b.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </span>
                <span className={`badge ${healthClass(b.budgetHealth)}`}>{b.budgetHealth}</span>
              </div>
              <div className="budget-history-amounts">
                <span>Budget: ₹{b.monthlyBudget?.toLocaleString()}</span>
                <span>Spent: ₹{b.totalSpent?.toLocaleString()} ({pct}%)</span>
              </div>
              <button
                className="budget-history-expand-btn"
                onClick={() => setExpandedId(isExpanded ? null : b._id)}
              >
                {isExpanded ? "Hide Expenses ▲" : "View Expenses ▼"}
              </button>
            </div>

            {isExpanded && (
              <div className="budget-history-expense-list">
                {b.expenses.length === 0 ? (
                  <div className="empty-state-sm">No expenses recorded.</div>
                ) : (
                  [...b.expenses].reverse().map((exp) => (
                    <div key={exp._id} className="budget-history-expense-row">
                      <span className="exp-category">{exp.category}</span>
                      <span className="exp-amount">₹{exp.amount.toLocaleString()}</span>
                      <span className={`badge ${exp.isMandatory ? "badge-approved" : "badge-pending"}`}>
                        {exp.isMandatory ? "Mandatory" : "Optional"}
                      </span>
                      <span className="exp-date">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
