import React from "react";

export default function WhatWeDo() {
  return (
    <section className="section bg-slate-50">
      <div className="container">
        <h2 className="h2">🧰 What I Do</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Mentoring & Consulting</h3>
            <p className="p mt-2">Individual and executive mentorship designed for growth, resilience, and clarity. I help leaders and teams align purpose with practice across leadership, culture, marketing strategy, startups, software development, AI, and more. Thirty-two years of lived experience mean the lessons aren't theoretical—they've been proven under real pressure.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Speaking & Workshops</h3>
            <p className="p mt-2">Keynotes, classroom lectures, and team workshops that translate leadership theory into real-world systems. Topics include servant leadership, business culture, team building, software and app development, and marketing strategy. Every session is conversational, story-driven, and practical—built to shift perspective and spark progress.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-lg">Fractional Leadership</h3>
            <p className="p mt-2">For organizations needing executive-level guidance without a full-time hire, I offer short- and long-term fractional C-suite leadership. From operational oversight to culture realignment, I help stabilize growth and set the stage for the next generation of leaders to rise.</p>
          </div>
        </div>

        <div className="mt-8 p-4 border border-slate-200 rounded-xl bg-white">
          <p className="text-sm text-slate-600">
            Related diagnostic: <a className="underline font-medium" href="https://scoreboardleadership.com">Scoreboard Leadership</a> — what we're not.
          </p>
        </div>
        
        <div className="mt-6 text-center">
          <a 
            href="/what-we-do" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            Learn more about my services →
          </a>
        </div>
      </div>
    </section>
  );
}
