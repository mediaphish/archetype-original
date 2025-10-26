import React from "react";

const PROMPTS = [
  "Business & growth consulting",
  "Leadership & team culture",
  "Mentorship & personal clarity",
  "Learn about Bart"
];

export default function QuickPrompts({ onPick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {PROMPTS.map((p) => (
        <button key={p} className="btn" onClick={() => onPick(p)}>
          {p}
        </button>
      ))}
    </div>
  );
}
