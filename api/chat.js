export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { messages = [], meta = {} } = req.body || {};
    const last = messages[messages.length - 1]?.content || "";

    // Very light, safe stub — no external calls yet.
    let reply =
      "Here’s how I can help: pick a quick prompt above, or share context about your team, goals, and constraints. ";
    if (/learn about bart/i.test(last)) {
      reply =
        "Bart builds leaders worth following. He created Scoreboard Leadership (the diagnostic) and Archetype Original (the cure). Want a quick overview of the 10 plays?";
    } else if (/leadership|culture/i.test(last)) {
      reply =
        "Let’s start with standards and rhythms. What’s one recurring meeting we can reform this week to produce clarity and clean handoffs?";
    } else if (/business|growth|consult/i.test(last)) {
      reply =
        "Growth compounds when systems replace heroics. What’s your current bottleneck: pipeline, delivery capacity, or retention?";
    } else if (/mentor|clarity/i.test(last)) {
      reply =
        "Clarity first: What outcome would make the next 90 days a win for you personally? We’ll reverse-engineer plays from there.";
    }

    // Example: offer escalation if input contains "book", "workshop", etc.
    const escalationOffered = /book|workshop|keynote|hire/i.test(last);

    return res.status(200).json({ reply, escalationOffered });
  } catch (e) {
    return res.status(500).json({ error: "Server error." });
  }
}
