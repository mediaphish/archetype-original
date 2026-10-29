/** GET ?token= -> a fresh download of the guide the buyer paid for (2026-10-28). */
import { downloadUrl } from '../../lib/shop/shop.js';

export default async function handler(req, res) {
  const url = await downloadUrl(req.query?.token).catch(() => null);
  if (!url) return res.status(404).send('This download link is not valid. Reply to your receipt email and Bart will sort it out.');
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, url);
}
