import {
  consumeGuestMagicLink,
  setGuestSessionCookie,
} from '../../lib/ao/podcastGuestAuth.js';

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
    const guestId = String(url.searchParams.get('guest_id') || '').trim();

    if (!token || !email || !guestId) {
      return res
        .status(400)
        .send(
          renderMessagePage(
            'Invalid link',
            'This access link is invalid.',
            `/podcast/guest/${guestId || ''}`,
            'Back to guest page'
          )
        );
    }

    const consumed = await consumeGuestMagicLink({ guestId, email, token });
    if (!consumed.ok) {
      const reasonText =
        consumed.reason === 'expired'
          ? 'This access link has expired.'
          : 'This access link is invalid or already used.';
      return res
        .status(400)
        .send(
          renderMessagePage(
            'Access failed',
            reasonText,
            `/podcast/guest/${guestId}`,
            'Request a new link'
          )
        );
    }

    const cookieOk = setGuestSessionCookie(res, guestId, email);
    if (!cookieOk) {
      return res
        .status(500)
        .send(
          renderMessagePage(
            'Error',
            'Could not start your session. Please try again.',
            `/podcast/guest/${guestId}`,
            'Back to guest page'
          )
        );
    }

    const destination = `${process.env.SITE_URL || 'https://www.archetypeoriginal.com'}/podcast/guest/${guestId}`;
    return res.status(302).setHeader('Location', destination).send('Redirecting to your guest page...');
  } catch (error) {
    console.error('[guest-magic-verify]', error);
    return res
      .status(500)
      .send(
        renderMessagePage(
          'Error',
          'An error occurred while verifying your link.',
          '/podcast/guest-intake',
          'Guest intake'
        )
      );
  }
}
