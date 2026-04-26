import { useState } from "react";
import MinionAvatar from "./MinionAvatar";

const API = process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

export default function AuthPage({ onAuth, onPending }) {
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
      if (data.pending) {
        onPending();
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
      {/* Floating background bananas */}
      <span className="auth-banana auth-banana-1">🍌</span>
      <span className="auth-banana auth-banana-2">🍌</span>
      <span className="auth-banana auth-banana-3">🍌</span>
      <span className="auth-banana auth-banana-4">🍌</span>
      <span className="auth-banana auth-banana-5">🍌</span>
      <span className="auth-banana auth-banana-6">🍌</span>

      <div className="auth-card">
        {/* Minion trio */}
        <div className="auth-minion-group">
          <div className="auth-minion-side auth-minion-left">
            <MinionAvatar size="sm" animated />
          </div>
          <div className="auth-minion-center">
            <MinionAvatar size="md" animated />
          </div>
          <div className="auth-minion-side auth-minion-right">
            <MinionAvatar size="sm" animated />
          </div>
        </div>

        <h1 className="auth-title">Money Minded Minions</h1>
        <p className="auth-subtitle">🍌 Smart budgeting with AI co-pilot 🍌</p>

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
