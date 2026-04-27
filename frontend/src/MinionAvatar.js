import React from "react";

export default function MinionAvatar({ animated = true, size = "md" }) {
  return (
    <div className={`minion-wrap minion-${size} ${animated ? "minion-animated" : ""}`}>
      <div className="minion-hair">
        <span /><span /><span />
      </div>
      <div className="minion-body">
        <div className="minion-strap" />
        <div className="minion-goggle">
          <div className="minion-eye">
            <div className="minion-pupil">
              <div className="minion-iris" />
              <div className="minion-shine" />
            </div>
          </div>
        </div>
        <div className="minion-overall">
          <div className="minion-pocket" />
        </div>
        <div className="minion-mouth" />
      </div>
    </div>
  );
}
