import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";

const API = process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

function authHeaders() {
  const t = localStorage.getItem("mmm_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
}

const CONFIDENCE_META = {
  High:         { label: "High",         cls: "confidence-high",         icon: "✅" },
  Medium:       { label: "Medium",       cls: "confidence-medium",       icon: "📊" },
  Low:          { label: "Low",          cls: "confidence-low",          icon: "⚠️" },
  Insufficient: { label: "Insufficient", cls: "confidence-insufficient", icon: "❓" },
};

const ADVISOR_META = {
  safe:        { label: "Safe to spend",      icon: "✅", cls: "advisor-safe" },
  caution:     { label: "Spend with caution", icon: "⚠️", cls: "advisor-caution" },
  inadvisable: { label: "Not advisable",      icon: "❌", cls: "advisor-inadvisable" },
};

function fmt(n) {
  return "₹" + Math.abs(n).toLocaleString("en-IN");
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="forecast-tooltip">
      <p className="forecast-tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function ForecastTab({ token }) {
  const [lookback, setLookback]       = useState(12);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/budgets/forecast?months=${lookback}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setForecastData(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Failed to load forecast. Is the backend running?"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [lookback]);

  const conf    = CONFIDENCE_META[forecastData?.confidence] ?? CONFIDENCE_META.Insufficient;
  const advisor = ADVISOR_META[forecastData?.smartAdvisor?.recommendation] ?? ADVISOR_META.inadvisable;

  return (
    <div className="forecast-tab">
      {/* Lookback toggle */}
      <div className="forecast-header-row">
        <h2 className="forecast-title">Spending Forecast 🔮</h2>
        <div className="forecast-toggle">
          <span className="forecast-toggle-label">Lookback:</span>
          {[12, 18, 24].map((m) => (
            <button
              key={m}
              className={`forecast-toggle-btn ${lookback === m ? "active" : ""}`}
              onClick={() => setLookback(m)}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="forecast-loading">
          <div className="forecast-spinner" />
          <span>Crunching your numbers… 🍌</span>
        </div>
      )}

      {error && !loading && (
        <div className="forecast-error">{error}</div>
      )}

      {!loading && !error && forecastData && (
        <>
          {/* Insufficient data warning */}
          {forecastData.insufficientData && (
            <div className="forecast-warning">
              ⚠️ Not enough history for reliable predictions. Showing available data only
              ({forecastData.actualMonthsUsed} month{forecastData.actualMonthsUsed !== 1 ? "s" : ""} found,
              3+ needed).
            </div>
          )}

          {forecastData.actualMonthsUsed === 0 && (
            <div className="forecast-empty">
              No budget history found. Create your first budget to start forecasting!
            </div>
          )}

          {forecastData.actualMonthsUsed > 0 && (
            <>
              {/* Summary cards */}
              <div className="forecast-summary-grid">
                <div className="forecast-card">
                  <div className="forecast-card-label">Predicted Budget</div>
                  <div className="forecast-card-value">{fmt(forecastData.predictedBudget)}</div>
                  <div className="forecast-card-sub">Based on last {forecastData.actualMonthsUsed} months</div>
                </div>

                <div className="forecast-card">
                  <div className="forecast-card-label">Predicted Spend</div>
                  <div className="forecast-card-value">{fmt(forecastData.predictedSpend)}</div>
                  <div className="forecast-card-sub">Weighted avg (recent months weighted higher)</div>
                </div>

                <div className={`forecast-card ${forecastData.predictedBalance >= 0 ? "forecast-card-positive" : "forecast-card-negative"}`}>
                  <div className="forecast-card-label">Predicted Balance</div>
                  <div className="forecast-card-value">
                    {forecastData.predictedBalance >= 0 ? "+" : "−"}{fmt(forecastData.predictedBalance)}
                  </div>
                  <div className="forecast-card-sub">
                    {forecastData.predictedBalance >= 0 ? "Surplus expected" : "Deficit expected"}
                  </div>
                </div>

                <div className="forecast-card">
                  <div className="forecast-card-label">Confidence</div>
                  <div className={`confidence-badge ${conf.cls}`}>
                    {conf.icon} {conf.label}
                  </div>
                  <div className="forecast-card-sub">{forecastData.actualMonthsUsed} months of data</div>
                </div>
              </div>

              {/* Trend chart */}
              {forecastData.historicalData?.length > 0 && (
                <div className="forecast-chart-container card">
                  <div className="card-title">Historical Budget vs Spend</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={forecastData.historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={{ stroke: "#334155" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 8 }}
                      />
                      <Bar dataKey="budget" name="Budget" radius={[3, 3, 0, 0]} fill="#4B8EDA" opacity={0.6}>
                        {forecastData.historicalData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.exceededBudget ? "#ef4444" : "#4B8EDA"}
                            opacity={0.6}
                          />
                        ))}
                      </Bar>
                      <Line
                        type="monotone"
                        dataKey="spent"
                        name="Spent"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={{ fill: "#f59e0b", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p className="forecast-chart-note">
                    Blue bars = monthly budget · Orange line = actual spend · Red bars = months budget was exceeded
                  </p>
                </div>
              )}

              {/* Category predictions */}
              {forecastData.categoryPredictions?.length > 0 && (
                <div className="forecast-categories card">
                  <div className="card-title">Predicted Spend by Category</div>
                  <table className="category-predictions-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Predicted Amount</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.categoryPredictions.map((cp) => (
                        <tr key={cp.category}>
                          <td className="cp-category">{cp.category}</td>
                          <td className="cp-amount">{fmt(cp.predicted)}</td>
                          <td className="cp-notes">
                            {cp.isNew && (
                              <span className="cp-badge cp-badge-new">New category</span>
                            )}
                            {cp.isHighVariance && (
                              <span className="cp-badge cp-badge-variance">⚠️ High variance</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Smart purchase advisor */}
              {forecastData.smartAdvisor && (
                <div className={`smart-advisor-card card ${advisor.cls}`}>
                  <div className="card-title">Smart Purchase Advisor</div>
                  <div className="advisor-stats">
                    <div className="advisor-stat">
                      <span className="advisor-stat-label">Current balance</span>
                      <span className="advisor-stat-value">{fmt(forecastData.smartAdvisor.currentBalance)}</span>
                    </div>
                    <div className="advisor-stat">
                      <span className="advisor-stat-label">Predicted remaining spend</span>
                      <span className="advisor-stat-value">−{fmt(forecastData.smartAdvisor.predictedRemainingSpend)}</span>
                    </div>
                    <div className="advisor-stat advisor-stat-highlight">
                      <span className="advisor-stat-label">Safe spending limit</span>
                      <span className={`advisor-stat-value ${forecastData.smartAdvisor.safeSpendingLimit >= 0 ? "value-positive" : "value-negative"}`}>
                        {forecastData.smartAdvisor.safeSpendingLimit >= 0 ? "" : "−"}{fmt(forecastData.smartAdvisor.safeSpendingLimit)}
                      </span>
                    </div>
                  </div>
                  <div className="advisor-recommendation">
                    {advisor.icon} Recommendation: <strong>{advisor.label}</strong>
                  </div>
                  {forecastData.purchaseAdvice && (
                    <p className="advisor-ai-advice">{forecastData.purchaseAdvice}</p>
                  )}
                </div>
              )}

              {/* AI Narrative */}
              {forecastData.aiNarrative && (
                <div className="ai-narrative-card card">
                  <div className="ai-advice-header">
                    <span className="ai-advice-label">✨ AI Forecast Insight</span>
                  </div>
                  <p className="ai-explanation">{forecastData.aiNarrative}</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
