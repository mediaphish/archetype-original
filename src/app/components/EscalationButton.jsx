import React from "react";

export default function EscalationButton({ visible, disabled, onClick }) {
  if (!visible) return null;
  return (
    <button className="btn" disabled={disabled} onClick={onClick}>
      Request human handoff
    </button>
  );
}
