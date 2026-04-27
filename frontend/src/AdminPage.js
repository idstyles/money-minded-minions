import React, { useState, useEffect } from "react";

const API = process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

export default function AdminPage({ token, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(userId, status) {
    setActionLoading((prev) => ({ ...prev, [userId]: status }));
    try {
      const res = await fetch(`${API}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: data.user.status } : u))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: null }));
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-secondary btn-sm" onClick={onBack}>
          ← Back
        </button>
        <h2 className="admin-title">User Management</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No users to review.</div>
      ) : (
        <div className="admin-user-list">
          {users.map((u) => (
            <div key={u._id} className="admin-user-row">
              <div className="admin-user-info">
                <span className="admin-user-name">{u.displayName || u.name}</span>
                <span className="admin-user-email">{u.email}</span>
                <span className="admin-user-date">
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="admin-user-actions">
                <span className={`badge badge-${u.status}`}>{u.status}</span>
                <button
                  className="btn-approve"
                  disabled={u.status === "approved" || actionLoading[u._id]}
                  onClick={() => updateStatus(u._id, "approved")}
                >
                  {actionLoading[u._id] === "approved" ? "…" : "Approve"}
                </button>
                <button
                  className="btn-reject"
                  disabled={u.status === "rejected" || actionLoading[u._id]}
                  onClick={() => updateStatus(u._id, "rejected")}
                >
                  {actionLoading[u._id] === "rejected" ? "…" : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
