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
    const { q1, q2, q2Other, q3, q4, q5, q6, q7, q8, role, roleOther, orgSize } = req.body || {};
    
    // Validate required fields
    if (!q1 || !q2 || !q2.length || !q3 || !q4 || !q4.length || !q5 || !q6 || !q7) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const from = process.env.CONTACT_FROM;
    const to = process.env.CONTACT_TO;
    if (!process.env.RESEND_API_KEY || !from || !to) {
      return res.status(500).json({ error: "Email is not configured." });
    }

    const subject = `Engagement Inquiry: ${role || 'Not specified'} from ${orgSize ? `${orgSize} person org` : 'Organization size not specified'}`;
    
    let html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a;">
        <h2 style="margin:0 0 12px 0;">New Engagement Inquiry</h2>
    `;

    html += `<p><strong>What prompted you to reach out at this point?</strong><br/>${nl2br(q1)}</p>`;
    
    html += `<p><strong>How would you describe your organization right now?</strong><br/>${q2.map(opt => escapeHtml(opt)).join(', ')}`;
    if (q2.includes('Other') && q2Other) {
      html += ` (Other: ${escapeHtml(q2Other)})`;
    }
    html += `</p>`;
    
    html += `<p><strong>What are you hoping an outside perspective would help you see or think through?</strong><br/>${nl2br(q3)}</p>`;
    
    html += `<p><strong>What type of leadership support are you most interested in exploring?</strong><br/>${q4.map(opt => escapeHtml(opt)).join(', ')}</p>`;
    
    html += `<p><strong>Looking ahead 6–12 months, what would meaningful progress look like to you?</strong><br/>${nl2br(q5)}</p>`;
    
    html += `<p><strong>What's currently working well that you want to protect as things evolve?</strong><br/>${nl2br(q6)}</p>`;
    
    html += `<p><strong>What level of partnership are you considering?</strong><br/>${escapeHtml(q7)}</p>`;
    
    if (q8) {
      html += `<p><strong>Additional context:</strong><br/>${nl2br(q8)}</p>`;
    }
    
    html += `<hr style="border:none;border-top:1px solid #e5e7eb; margin:16px 0;" />`;
    html += `<h3 style="margin:16px 0 8px 0;">Context (Optional)</h3>`;
    
    if (role) {
      html += `<p><strong>Role:</strong> ${escapeHtml(role)}`;
      if (role === 'Other' && roleOther) {
        html += ` (${escapeHtml(roleOther)})`;
      }
      html += `</p>`;
    }
    
    if (orgSize) {
      html += `<p><strong>Organization Size:</strong> ${escapeHtml(orgSize)}</p>`;
    }
    
    html += `
        <hr style="border:none;border-top:1px solid #e5e7eb; margin:16px 0;" />
        <p style="font-size:12px;color:#64748b;">Sent from archetypeoriginal.com engagement inquiry form</p>
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
    console.error('Engagement inquiry error:', err);
    return res.status(500).json({ error: "Server error." });
  }
}

