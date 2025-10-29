import React from "react";

export default function WhatWeDo() {
  return (
    <section className="section bg-slate-50">
      <div className="container">
        <h2 className="h2">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <a href="/mentoring-consulting" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-semibold text-lg">Mentoring & Consulting</h3>
            <p className="p mt-2">Individual mentorships, executive leadership consulting, and business & team consulting. 32 years of knowledge in leadership, servant leadership, business culture, employee engagement, marketing strategies, startups, software development, AI, and more.</p>
          </a>
          <a href="/speaking-workshops" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-semibold text-lg">Speaking & Workshops</h3>
            <p className="p mt-2">Keynotes, class lectures, and group workshops on business and leadership. If it's business, I've had exposure and experience with it.</p>
          </a>
          <a href="/fractional-leadership" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-semibold text-lg">Fractional Leadership</h3>
            <p className="p mt-2">Contractual fractional roles in leadership, including C-Suite level positions for short and long-term business needs.</p>
          </a>
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
