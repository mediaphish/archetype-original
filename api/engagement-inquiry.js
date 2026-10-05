import { Resend } from "resend";
import { contactFormRecipient } from "../lib/contact-form-inbox.js";
import { evaluateSpamGuards } from "../lib/contact-spam-guard.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

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
    const spam = evaluateSpamGuards("engagement", req, req.body || {});
    if (spam.outcome === "silently_accept") {
      if (spam.detail === "honeypot") return res.status(200).json({ ok: true });
      return res.status(400).json({
        error:
          "Please wait a few seconds after the page loads, then try submitting again.",
      });
    }
    if (spam.outcome === "rate_limit") {
      return res.status(429).json({ error: spam.message || "Too many requests." });
    }

    const {
      form_loaded_at: _fl,
      _trap: _tp,
      name,
      email,
      phone,
      q1,
      q2,
      q2Other,
      q3,
      q4,
      q5,
      q6,
      q7,
      q8,
      role,
      roleOther,
      orgSize,
    } = req.body || {};
    
    // Validate required fields
    if (!q1 || !q2 || !q2.length || !q3 || !q4 || !q4.length || !q5 || !q6 || !q7) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Someone has to be reachable at the end of this.
    //
    // 2026-10-04. An inquiry arrived describing a conversation Bart had had in
    // the spring, and there was no way to answer it: this form had never asked
    // who was filling it in, and the handler stored nothing, so the notification
    // email was the only copy that had ever existed.
    const senderName = String(name || "").trim();
    const senderEmail = String(email || "").trim();
    const senderPhone = String(phone || "").trim();
    if (!senderName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      return res.status(400).json({
        error: "Please add your name and an email address so Bart can reply to you.",
      });
    }

    // Stored before it is sent. A notification that fails to deliver is then an
    // inconvenience rather than a person nobody can find again.
    let inquiryId = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("engagement_inquiries")
        .insert({
          name: senderName,
          email: senderEmail,
          phone: senderPhone || null,
          role: role || null,
          role_other: roleOther || null,
          org_size: orgSize || null,
          answers: { q1, q2, q2Other, q3, q4, q5, q6, q7, q8 },
        })
        .select("id")
        .single();
      if (error) throw error;
      inquiryId = data?.id || null;
    } catch (dbErr) {
      // Keep going. Losing the record is bad; refusing the inquiry is worse.
      console.error("[engagement-inquiry] could not store the inquiry:", dbErr?.message || dbErr);
    }

    const from = process.env.CONTACT_FROM;
    const to = contactFormRecipient();
    if (!process.env.RESEND_API_KEY || !from) {
      return res.status(500).json({ error: "Email is not configured." });
    }

    const subject = `Engagement Inquiry: ${escapeHtml(senderName)}${orgSize ? ` (${orgSize} person org)` : ''}`;
    
    let html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a;">
        <h2 style="margin:0 0 12px 0;">New Engagement Inquiry</h2>
    `;

    // Who it is, at the top, where a reply starts.
    html += `<p style="margin:0 0 16px 0;padding:12px;background:#f8fafc;border:1px solid #e5e7eb;">`;
    html += `<strong>${escapeHtml(senderName)}</strong><br/>`;
    html += `<a href="mailto:${escapeHtml(senderEmail)}">${escapeHtml(senderEmail)}</a>`;
    if (senderPhone) html += `<br/>${escapeHtml(senderPhone)}`;
    html += `</p>`;

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
      html,
      ...(senderEmail ? { reply_to: senderEmail } : {}),
    });

    if (inquiryId) {
      // Best effort: the record already exists either way.
      try {
        await supabaseAdmin
          .from("engagement_inquiries")
          .update({
            email_delivered: !result?.error,
            email_error: result?.error ? String(result.error.message || result.error).slice(0, 500) : null,
          })
          .eq("id", inquiryId);
      } catch (_) {}
    }

    if (result?.error) {
      // The inquiry is saved, so this is not a lost person. Say so plainly
      // rather than telling someone their message failed.
      if (inquiryId) {
        return res.status(200).json({ ok: true, notification_delayed: true });
      }
      return res.status(500).json({ error: "Failed to send message." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Engagement inquiry error:', err);
    return res.status(500).json({ error: "Server error." });
  }
}

