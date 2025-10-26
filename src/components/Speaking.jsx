import React from "react";

export default function Speaking() {
  return (
    <section className="section bg-slate-50">
      <div className="container">
        <h2 className="h2">Speaking & Workshops</h2>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Keynote: The Scoreboard Trap</h3>
            <p className="p mt-2">
              When metrics become theater, teams wither. This talk exposes scoreboard leadership and
              replaces it with servant standards that compound performance.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Workshop: Install the 10 Plays</h3>
            <p className="p mt-2">
              A practical half-day to map your team’s rhythms, assign owners, and leave with Monday-ready action.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
