/**
 * GET /api/ao/meta-accounts
 *
 * Read-only diagnostic route. Returns all Facebook Pages and Instagram accounts
 * connected to the current META_ACCESS_TOKEN. Used to discover account IDs
 * for wiring additional accounts into the publishing system.
 *
 * Never exposes the raw token — all API calls happen server-side.
 */

import { requireAoSession } from '../../lib/ao/requireAoSession.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ ok: false, error: 'META_ACCESS_TOKEN is not set' });
  }

  try {
    // Fetch all Facebook Pages connected to this token
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,instagram_business_account&access_token=${token}`
    );
    const pagesData = await pagesRes.json();

    // Fetch the user's own Instagram accounts via the token
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,instagram_business_account&access_token=${token}`
    );
    const igData = await igRes.json();

    // Collect all Instagram account IDs found
    const instagramAccounts = [];

    if (pagesData.data && Array.isArray(pagesData.data)) {
      for (const page of pagesData.data) {
        if (page.instagram_business_account) {
          instagramAccounts.push({
            source: `Facebook Page: ${page.name} (${page.id})`,
            instagram_id: page.instagram_business_account.id,
          });
        }
      }
    }

    if (igData.instagram_business_account) {
      instagramAccounts.push({
        source: `Me (${igData.name}, ${igData.id})`,
        instagram_id: igData.instagram_business_account.id,
      });
    }

    // For each Instagram ID found, get the username
    const enriched = await Promise.all(
      instagramAccounts.map(async (acct) => {
        try {
          const detailRes = await fetch(
            `https://graph.facebook.com/v19.0/${acct.instagram_id}?fields=id,username,name,account_type&access_token=${token}`
          );
          const detail = await detailRes.json();
          return { ...acct, username: detail.username, name: detail.name, account_type: detail.account_type };
        } catch {
          return acct;
        }
      })
    );

    return res.status(200).json({
      ok: true,
      facebook_pages: (pagesData.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
      })),
      instagram_accounts: enriched,
      raw_me: { id: igData.id, name: igData.name },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Meta API call failed' });
  }
}
