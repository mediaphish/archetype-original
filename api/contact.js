import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(str = "") {
  return escapeHtml(str).replace(/\n/g, "<br/>");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    const from = process.env.CONTACT_FROM;
    const to = process.env.CONTACT_TO;
    if (!process.env.RESEND_API_KEY || !from || !to) {
      return res.status(500).json({ error: "Email is not configured." });
    }

    const subject = `Archetype Original — New Message from ${name}`;
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a;">
        <h2 style="margin:0 0 12px 0;">New Contact Message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong><br/>${nl2br(message)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb; margin:16px 0;" />
        <p style="font-size:12px;color:#64748b;">Sent from archetypeoriginal.com contact form</p>
      </div>
    `;

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html
    });

    if (result?.error) {
      return res.status(500).json({ error: "Failed to send message." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
}
