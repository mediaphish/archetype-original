import { consumeMagicLinkToken, createAdminSession } from '../lib/badLeaderAuth.js';

function renderMessagePage(title, message, linkHref, linkText) {
  return `<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>body{font-family:Inter,Arial,sans-serif;max-width:560px;margin:64px auto;padding:0 20px;color:#1A1A1A}a{color:#DB0812}</style>
  </head><body><h1 style="font-family:Georgia,serif;font-weight:400">${title}</h1><p>${message}</p><p><a href="${linkHref}">${linkText}</a></p></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = String(url.searchParams.get('token') || '').trim();
    const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
    if (!token || !email) {
      return res
        .status(400)
        .send(
          renderMessagePage(
            'Invalid link',
            'This sign-in link is invalid.',
            '/culture-science/bad-leader-project/admin/login',
            'Back to admin login'
          )
        );
    }

    const consumed = await consumeMagicLinkToken(email, token);
    if (!consumed.ok) {
      const reasonText = consumed.reason === 'expired' ? 'This sign-in link has expired.' : 'This sign-in link is invalid or already used.';
      return res
        .status(400)
        .send(
          renderMessagePage(
            'Sign-in failed',
            reasonText,
            '/culture-science/bad-leader-project/admin/login',
            'Request a new link'
          )
        );
    }

    const session = await createAdminSession(email);
    const destination = `${process.env.SITE_URL || 'https://www.archetypeoriginal.com'}/culture-science/bad-leader-project/admin?token=${encodeURIComponent(session.token)}`;
    return res.status(302).setHeader('Location', destination).send(`Redirecting to admin...`);
  } catch (error) {
    console.error('[BLP MAGIC LINK VERIFY] Error:', error);
    return res
      .status(500)
      .send(
        renderMessagePage(
          'Error',
          'An error occurred while verifying your link.',
            '/culture-science/bad-leader-project/admin/login',
            'Back to admin login'
        )
      );
  }
}
