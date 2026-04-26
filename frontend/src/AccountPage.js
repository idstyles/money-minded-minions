import React, { useState, useEffect } from "react";

const API = process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

export default function AccountPage({ token, onBack, onLogout, onNameUpdate }) {
  const [accountInfo, setAccountInfo] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameMsg, setNameMsg] = useState({ text: "", ok: true });
  const [pwMsg, setPwMsg] = useState({ text: "", ok: true });
  const [nameSaving, setNameSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/account/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setAccountInfo(data);
        setDisplayName(data.displayName || data.name || "");
      });
  }, [token]);

  async function saveName(e) {
    e.preventDefault();
    setNameMsg({ text: "", ok: true });
    setNameSaving(true);
    try {
      const res = await fetch(`${API}/account/display-name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNameMsg({ text: "Display name updated.", ok: true });
      onNameUpdate(data.displayName);
    } catch (e) {
      setNameMsg({ text: e.message, ok: false });
    } finally {
      setNameSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg({ text: "", ok: true });
    if (newPassword !== confirmPassword) {
      return setPwMsg({ text: "New passwords do not match.", ok: false });
    }
    if (newPassword.length < 6) {
      return setPwMsg({ text: "Password must be at least 6 characters.", ok: false });
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API}/account/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPwMsg({ text: "Password changed successfully.", ok: true });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPwMsg({ text: e.message, ok: false });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="account-page">
      <div className="account-header">
        <button className="btn-secondary btn-sm" onClick={onBack}>
          ← Back
        </button>
        <h2 className="account-title">My Account</h2>
      </div>

      {accountInfo && (
        <>
          <div className="account-section">
            <h3 className="account-section-title">Account Info</h3>
            <div className="account-info-grid">
              <span className="account-info-label">Name</span>
              <span className="account-info-value">{accountInfo.name}</span>
              <span className="account-info-label">Email</span>
              <span className="account-info-value">{accountInfo.email}</span>
              <span className="account-info-label">Member since</span>
              <span className="account-info-value">
                {new Date(accountInfo.createdAt).toLocaleDateString()}
              </span>
              <span className="account-info-label">Status</span>
              <span className="account-info-value">
                <span className={`badge badge-${accountInfo.status}`}>{accountInfo.status}</span>
              </span>
            </div>
          </div>

          <div className="account-section">
            <h3 className="account-section-title">Change Display Name</h3>
            <form className="account-form" onSubmit={saveName}>
              <input
                className="input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                required
              />
              <button className="btn-primary" type="submit" disabled={nameSaving}>
                {nameSaving ? "Saving…" : "Save Name"}
              </button>
              {nameMsg.text && (
                <span className={`inline-message ${nameMsg.ok ? "inline-message-success" : "inline-message-error"}`}>
                  {nameMsg.text}
                </span>
              )}
            </form>
          </div>

          <div className="account-section">
            <h3 className="account-section-title">Change Password</h3>
            <form className="account-form" onSubmit={changePassword}>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
              />
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
              />
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              <button className="btn-primary" type="submit" disabled={pwSaving}>
                {pwSaving ? "Saving…" : "Change Password"}
              </button>
              {pwMsg.text && (
                <span className={`inline-message ${pwMsg.ok ? "inline-message-success" : "inline-message-error"}`}>
                  {pwMsg.text}
                </span>
              )}
            </form>
          </div>

          <div className="account-section">
            <button className="btn-logout-full" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
