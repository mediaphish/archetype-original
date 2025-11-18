import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);
const HANDOFF_TO_EMAIL = process.env.HANDOFF_TO_EMAIL || 'bart@archetypeoriginal.com';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fullName,
      companyName,
      companySize,
      email,
      phone,
      website,
      role,
      whyInterested,
      consent
    } = req.body || {};

    // Validation
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name' });
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!companyName || companyName.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your company name' });
    }

    if (!companySize) {
      return res.status(400).json({ error: 'Please select your company size range' });
    }

    if (!consent) {
      return res.status(400).json({ error: 'Please review and accept our privacy policy to continue' });
    }

    // Store in Supabase
    const { data: applicationData, error: supabaseError } = await supabase
      .from('ali_applications')
      .insert([
        {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          company_size: companySize,
          email: email.trim(),
          phone: phone?.trim() || null,
          website: website?.trim() || null,
          role: role?.trim() || null,
          why_interested: whyInterested?.trim() || null,
          consent: consent,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return res.status(500).json({ error: 'Failed to save application. Please try again.' });
    }

    // Send confirmation email to applicant
    try {
      const confirmationSubject = 'Your ALI Pilot Application Has Been Received';
      const confirmationHtml = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a; max-width:600px; margin:0 auto;">
          <h2 style="margin:0 0 12px 0; color:#1D1F21;">Hi ${escapeHtml(fullName)},</h2>
          <p>Thank you for applying to join the Archetype Leadership Index pilot program. I've received your application for <strong>${escapeHtml(companyName)}</strong> and wanted to personally reach out.</p>
          
          <h3 style="margin:24px 0 12px 0; color:#2B3A67;">What Happens Next:</h3>
          <p>I'll review your application within the next 3 business days. If your organization is a good fit for the pilot, I'll send you:</p>
          <ul style="margin:12px 0; padding-left:24px;">
            <li>Survey links to distribute to your team</li>
            <li>Simple instructions for rolling out the assessment</li>
            <li>Details on how the anonymous assessment process works</li>
            <li>Timeline for when you can expect aggregate insights</li>
          </ul>
          
          <div style="background-color:#F8F7F3; border-left:4px solid #2B3A67; padding:16px; margin:24px 0;">
            <h3 style="margin:0 0 8px 0; color:#2B3A67;">A Quick Reminder About Privacy:</h3>
            <p style="margin:0;">All team assessments are completely anonymous. You won't see individual responses, and neither will I. We only share aggregate data when there are at least 5 responses to protect individual privacy. Your team's honest feedback is what makes this tool valuable.</p>
          </div>
          
          <p>I'm excited about the possibility of working with <strong>${escapeHtml(companyName)}</strong> to better understand and strengthen your leadership culture. Leadership that lasts doesn't happen by accident—it's built intentionally, one decision at a time.</p>
          
          <p>If you have any questions in the meantime, don't hesitate to reach out.</p>
          
          <p style="margin-top:24px;">
            — Bart Paden<br/>
            <strong>Archetype Original</strong><br/>
            <a href="mailto:bart@archetypeoriginal.com" style="color:#6A1B1A;">bart@archetypeoriginal.com</a>
          </p>
        </div>
      `;

      await resend.emails.send({
        from: 'Archetype Original <noreply@archetypeoriginal.com>',
        to: email.trim(),
        subject: confirmationSubject,
        html: confirmationHtml
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    // Send internal notification to Bart
    try {
      const internalSubject = `New ALI Pilot Application: ${companyName}`;
      const internalText = `
New ALI Pilot Application Received

Company Details:
• Company Name: ${companyName}
• Company Size: ${companySize}
• Website: ${website || 'Not provided'}

Contact Information:
• Name: ${fullName}
• Email: ${email}
• Phone: ${phone || 'Not provided'}
• Role: ${role || 'Not provided'}

Why They're Interested:
${whyInterested || 'Not provided'}

Submitted: ${new Date().toLocaleString()}
      `.trim();

      await resend.emails.send({
        from: 'Archetype Original <noreply@archetypeoriginal.com>',
        to: HANDOFF_TO_EMAIL,
        subject: internalSubject,
        text: internalText
      });
    } catch (emailError) {
      console.error('Failed to send internal notification:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({ 
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

