/**
 * Find a previously approved AO quote card to use as a generation reference.
 *
 * The failure this addresses, in Bart's words: Auto "fails on any image that
 * has me in it."
 *
 * The split is not standalone-vs-series, which is what the publish data first
 * suggests. It is whether the image contains Bart. The Archetype series headers
 * are painterly biblical scenes — no likeness, no text, no logo — so the model
 * has nothing hard to do and they come out fine. The images that fail are the
 * quote cards: his face, the brand type treatment, and the logo lockup in one
 * frame. Every one of those in the last month is a manual upload.
 *
 * When Bart makes one himself he hands ChatGPT a single previously approved
 * card and a short instruction — "generate something similar, change the room
 * to a dystopian office, put me in a black hoodie, don't mess with my face,
 * don't touch the logo." That one reference carries his likeness, the type
 * treatment, the logo lockup, and the composition. He supplies only the scene
 * and the wardrobe, which is why the wardrobe varies while the system holds.
 *
 * Auto had no equivalent. Its reference chain covers series posts (inherit the
 * prior part's image) and resurface posts (a real photo); a card generated from
 * scratch matched nothing and ran with zero references. The activity log for
 * "the-signal-i-was-actually-watching" shows attempt one as images/generations
 * with reference_count 0, then eight more over five and a half hours, then a
 * manual upload.
 *
 * CRITICAL: this must never return one of the painterly series scenes. Handing
 * a Barnabas oil painting to a card generation would teach exactly the wrong
 * thing. Only images that are actually AO cards qualify, and when none exist
 * this returns null so the caller falls through rather than referencing
 * something misleading.
 */

// ao_content_drafts is gated by scripts/verify-no-direct-table-access.mjs, so
// go through the sanctioned accessor rather than supabaseAdmin.from(). This is
// a read; the named helpers in that module are for identity-sensitive writes.
async function drafts() {
  const { contentDrafts } = await import('../db/contentDrafts.js');
  return contentDrafts();
}

/**
 * Does this image URL look like an AO quote card rather than an illustration?
 *
 * Manual uploads are the signal available today: every card Bart has shipped in
 * the last month he built by hand, and every auto-generated header is a
 * scene illustration. It is a proxy rather than a property of the image, so it
 * is isolated here — when cards start being generated successfully, this is the
 * one function to revisit.
 */
export function looksLikeQuoteCard(url) {
  return /manual-upload/i.test(String(url || ''));
}

/**
 * Most recent approved AO quote card for this owner, or null.
 *
 * @param {{ email: string, excludeSlug?: string|null, limit?: number }} args
 * @returns {Promise<string|null>}
 */
export async function loadRecentApprovedHeaderUrl({ email, excludeSlug = null, limit = 40 } = {}) {
  const emailNorm = String(email || '').toLowerCase().trim();
  if (!emailNorm) return null;

  try {
    const { data, error } = await (await drafts())
      .select('slug, status, image_url, updated_at')
      .eq('created_by_email', emailNorm)
      .eq('kind', 'journal')
      .in('status', ['approved', 'published'])
      .not('image_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(Math.max(Number(limit) || 40, 1));

    if (error) {
      console.warn('[recentApprovedHeader] lookup failed:', error.message);
      return null;
    }

    const card = (data || [])
      .filter((row) => String(row?.image_url || '').trim())
      .filter((row) => !excludeSlug || row.slug !== excludeSlug)
      .find((row) => looksLikeQuoteCard(row.image_url));

    // Deliberately null rather than "closest available". A scene illustration
    // is a worse reference than no reference for a card.
    return card ? String(card.image_url).trim() : null;
  } catch (err) {
    console.warn('[recentApprovedHeader] lookup threw:', err?.message || err);
    return null;
  }
}
