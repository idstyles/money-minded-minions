import React from "react";
import MinionAvatar from "./MinionAvatar";

export default function PendingPage({ onBackToLogin }) {
  return (
    <div className="pending-screen">
      <div className="pending-card">
        <MinionAvatar size="md" animated />
        <h2 className="pending-title" style={{ marginTop: 16 }}>Account Pending Approval</h2>
        <p className="pending-message">
          Your account is awaiting administrator approval. You will be able to
          log in once your account has been reviewed.
        </p>
        <button className="btn-secondary" onClick={onBackToLogin}>
          Back to Login
        </button>
      </div>
    </div>
  );
}
