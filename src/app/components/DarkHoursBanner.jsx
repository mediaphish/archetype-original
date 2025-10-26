import React from "react";
import { isDarkHours, cstNow, fmtCST } from "../utils/darkHours.js";

export default function DarkHoursBanner() {
  const now = cstNow();
  const dark = isDarkHours(now);
  if (!dark) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="container py-3 text-sm text-yellow-900">
        <strong>Heads up:</strong> Live handoffs resume at <strong>10:00am CST</strong>.
        It’s currently {fmtCST(now)}.
      </div>
    </div>
  );
}
