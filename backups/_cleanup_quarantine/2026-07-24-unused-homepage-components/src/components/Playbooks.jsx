import React from "react";

const plays = [
  "Protect the Culture",
  "Clarity Beats Chaos",
  "Owner Standard, Operator Freedom",
  "Signal Over Spotlight",
  "Invest in People, Not Optics",
  "One Page, One Owner, One Outcome",
  "Daily Huddles That Produce",
  "Servant Standards > Scoreboard Theater",
  "Hiring for Character, Training for Skill",
  "Post-Mortems That Heal and Improve"
];

export default function Playbooks() {
  return (
    <section id="playbooks" className="section">
      <div className="container">
        <h2 className="h2">Playbooks</h2>
        <p className="p mt-2 max-w-2xl">
          Ten plays that install servant leadership into the operating system of your business.
        </p>
        <ol className="grid md:grid-cols-2 gap-4 mt-8 list-decimal list-inside">
          {plays.map((item, i) => (
            <li key={i} className="card p-4">{item}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
