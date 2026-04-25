import { useState } from "react";

const API = "http://localhost:5000";

export default function AuthPage({ onAuth }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = tab === "login" ? { email, password } : { name, email, password };
      const res = await fetch(`${API}/auth/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      onAuth(data.token, data.user);
    } catch {
      setError("Connection error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(next) {
    setTab(next);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">💰</div>
        <h1 className="auth-title">Money Minded Minions</h1>
        <p className="auth-subtitle">Smart budgeting with AI co-pilot</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => switchTab("login")}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => switchTab("register")}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === "register" && (
            <input
              className="auth-input"
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
