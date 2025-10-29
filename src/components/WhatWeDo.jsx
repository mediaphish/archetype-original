import React from "react";

export default function WhatWeDo() {
  return (
    <section className="section bg-slate-50">
      <div className="container">
        <h2 className="h2">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Mentoring & Consulting</h3>
            <p className="p mt-2">One-on-one guidance for individuals, leaders, teams, and entire companies looking to build better culture and leadership.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Workshops that align</h3>
            <p className="p mt-2">Get the room on the same page. Standards, roles, and rituals installed.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Talks that reset culture</h3>
            <p className="p mt-2">Stories + standards that replace noise with conviction and practical next steps.</p>
          </div>
        </div>

        <div className="mt-8 p-4 border border-slate-200 rounded-xl bg-white">
          <p className="text-sm text-slate-600">
            Related diagnostic: <a className="underline font-medium" href="https://scoreboardleadership.com">Scoreboard Leadership</a> — what we’re not.
          </p>
        </div>
      </div>
    </section>
  );
}
