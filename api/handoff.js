export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    // Later: push to Slack; create Supabase row; send Resend confirmation, etc.
    // For now: accept and no-op.
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Server error." });
  }
}
