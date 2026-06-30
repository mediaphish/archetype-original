import { Resend } from 'resend';
import { contactFormRecipient } from '../../lib/contact-form-inbox.js';
import { evaluateSpamGuards } from '../../lib/contact-spam-guard.js';
import { insertGuestIntake, normalizeSocialLinks } from '../../lib/ao/guestIntakeStore.js';
import { sendGuestMagicLinkEmail } from '../../lib/ao/podcastGuestAuth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X / Twitter',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  other: 'Other',
};

const QUESTIONS = [
  "What's something people get wrong about you?",
  "Where are you right now that you didn't expect to be five years ago?",
  "What's a story from your life you think about more than people would guess?",
  'What are you into right now? Books, shows, hobbies, whatever.',
  'What else do you want us to know?',
];

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function nl2br(str = '') {
  return escapeHtml(str).replace(/\n/g, '<br/>');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function fieldBlock(label, value) {
  if (!String(value || '').trim()) return '';
  return `<p><strong>${escapeHtml(label)}</strong><br/>${nl2br(value)}</p>`;
}

function buildSubmissionHtml(payload, guestId) {
  const socialLinks = normalizeSocialLinks(payload.social_links);
  let html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a;">
      <h2 style="margin:0 0 12px 0;">New Podcast Guest Intake</h2>
      <p style="font-size:13px;color:#64748b;">Submission ID: ${escapeHtml(guestId || '')}</p>
  `;

  html += fieldBlock('Name', payload.name);
  html += `<p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>`;
  if (payload.phone) {
    html += `<p><strong>Phone:</strong> ${escapeHtml(payload.phone)}`;
    if (payload.text_ok) html += ' (okay to text about this episode)';
    html += '</p>';
  }
  if (payload.website) html += `<p><strong>Website:</strong> ${escapeHtml(payload.website)}</p>`;
  if (payload.company) html += `<p><strong>Company or organization:</strong> ${escapeHtml(payload.company)}</p>`;
  if (payload.image_url) {
    html += `<p><strong>Headshot / logo:</strong> <a href="${escapeHtml(payload.image_url)}">${escapeHtml(payload.image_url)}</a></p>`;
  }

  if (socialLinks.length) {
    html += '<p><strong>Social links:</strong></p><ul>';
    for (const link of socialLinks) {
      html += `<li>${escapeHtml(PLATFORM_LABELS[link.platform] || link.platform)}: <a href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a></li>`;
    }
    html += '</ul>';
  }

  html += fieldBlock('Bio', payload.bio_md);

  const answers = [
    payload.question_1,
    payload.question_2,
    payload.question_3,
    payload.question_4,
    payload.question_5,
  ];
  answers.forEach((answer, i) => {
    html += fieldBlock(QUESTIONS[i], answer);
  });

  html += `
      <hr style="border:none;border-top:1px solid #e5e7eb; margin:16px 0;" />
      <p style="font-size:12px;color:#64748b;">Sent from archetypeoriginal.com podcast guest intake form</p>
    </div>
  `;
  return html;
}

function buildGuestConfirmationHtml(payload) {
  const socialLinks = normalizeSocialLinks(payload.social_links);
  let html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a;">
      <h2 style="margin:0 0 12px 0;">Thanks — we received your guest intake</h2>
      <p>Bart has your information and will reference it before your conversation. Here is a copy of what you submitted.</p>
  `;

  html += fieldBlock('Name', payload.name);
  if (payload.phone) {
    html += `<p><strong>Phone:</strong> ${escapeHtml(payload.phone)}`;
    if (payload.text_ok) html += ' (okay to text about this episode)';
    html += '</p>';
  }
  if (payload.website) html += `<p><strong>Website:</strong> ${escapeHtml(payload.website)}</p>`;
  if (payload.company) html += `<p><strong>Company or organization:</strong> ${escapeHtml(payload.company)}</p>`;

  if (socialLinks.length) {
    html += '<p><strong>Where to find you:</strong></p><ul>';
    for (const link of socialLinks) {
      html += `<li>${escapeHtml(PLATFORM_LABELS[link.platform] || link.platform)}: ${escapeHtml(link.url)}</li>`;
    }
    html += '</ul>';
  }

  html += fieldBlock('Bio', payload.bio_md);

  const answers = [
    payload.question_1,
    payload.question_2,
    payload.question_3,
    payload.question_4,
    payload.question_5,
  ];
  answers.forEach((answer, i) => {
    html += fieldBlock(QUESTIONS[i], answer);
  });

  html += `
      <hr style="border:none;border-top:1px solid #e5e7eb; margin:16px 0;" />
      <p style="font-size:14px;">Questions before the episode? Reply to this email any time.</p>
      <p style="font-size:12px;color:#64748b;">Archetype Original — The Archetype Original Podcast</p>
    </div>
  `;
  return html;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const spam = evaluateSpamGuards('engagement', req, req.body || {});
    if (spam.outcome === 'silently_accept') {
      if (spam.detail === 'honeypot') return res.status(200).json({ ok: true });
      return res.status(400).json({
        error: 'Please wait a few seconds after the page loads, then try submitting again.',
      });
    }
    if (spam.outcome === 'rate_limit') {
      return res.status(429).json({ error: spam.message || 'Too many requests.' });
    }

    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const textOk = Boolean(body.text_ok) && Boolean(phone);
    const website = String(body.website || '').trim();
    const company = String(body.company || '').trim();
    const imageUrl = String(body.image_url || '').trim();
    const bioMd = String(body.bio_md || '').trim().slice(0, 5000);
    const releaseAgreed = Boolean(body.release_agreed);

    if (!name || !email || !releaseAgreed) {
      return res.status(400).json({ error: 'Name, email, and release agreement are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const payload = {
      name,
      email,
      phone: phone || '',
      text_ok: textOk,
      website: website || '',
      company: company || '',
      image_url: imageUrl || '',
      social_links: normalizeSocialLinks(body.social_links),
      bio_md: bioMd,
      question_1: String(body.question_1 || '').trim(),
      question_2: String(body.question_2 || '').trim(),
      question_3: String(body.question_3 || '').trim(),
      question_4: String(body.question_4 || '').trim(),
      question_5: String(body.question_5 || '').trim(),
    };

    const stored = await insertGuestIntake(payload);
    if (!stored.ok) {
      if (stored.error === 'guest_intake_table_missing') {
        return res.status(503).json({
          error: 'Guest intake is not configured yet. Please contact Bart directly.',
        });
      }
      return res.status(500).json({ error: stored.error || 'Could not save submission.' });
    }

    const from = process.env.CONTACT_FROM;
    const to = contactFormRecipient();
    if (!process.env.RESEND_API_KEY || !from) {
      return res.status(500).json({ error: 'Email is not configured.' });
    }

    const bartResult = await resend.emails.send({
      from,
      to,
      subject: `Podcast Guest Intake: ${name}`,
      html: buildSubmissionHtml(payload, stored.guest?.id),
    });

    if (bartResult?.error) {
      console.error('[guest-intake] Bart notification failed:', bartResult.error);
      return res.status(500).json({ error: 'Submission saved but notification failed. Please contact Bart.' });
    }

    const guestResult = await resend.emails.send({
      from,
      to: email,
      subject: 'Your Archetype Original Podcast guest intake',
      html: buildGuestConfirmationHtml(payload),
    });

    if (guestResult?.error) {
      console.warn('[guest-intake] Guest confirmation failed:', guestResult.error);
    }

    try {
      await sendGuestMagicLinkEmail({ guest: stored.guest, req });
    } catch (magicErr) {
      console.warn('[guest-intake] Guest magic link failed:', magicErr?.message || magicErr);
    }

    return res.status(200).json({ ok: true, id: stored.guest?.id });
  } catch (err) {
    console.error('[guest-intake]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
