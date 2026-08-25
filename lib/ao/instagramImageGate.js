/**
 * Refuse to schedule Instagram captions when the draft has no image yet.
 *
 * Instagram will not accept a feed post without an image. Scheduling one anyway
 * does not fail at schedule time; it fails silently at post time, days later,
 * and only on Instagram while every other channel goes out normally.
 *
 * That is not hypothetical. "The Standard That Held" published on 2026-08-19
 * with both Instagram rows scheduled and both dead on arrival: "Instagram feed
 * posts require an image (image_url)". X, LinkedIn and Facebook posted fine, so
 * the launch looked successful. The two missing channels were later reported as
 * never having been scheduled at all. They had been. They were scheduled
 * without an image, which Instagram was never going to accept.
 *
 * Its own module, and not a helper inside scheduleJournalLaunchCaptions.js,
 * because that file imports the scheduler, which imports supabase-admin at
 * module scope. Testing one line of array filtering would otherwise require a
 * database connection, and the test suite fails on a missing SUPABASE_URL
 * before the rule is ever exercised.
 */

/**
 * @param {object} opts
 * @param {Array<{platform?: string}>} [opts.channels] Channels being scheduled.
 * @param {string|null} [opts.imageUrl] The draft's image_url as it stands now.
 * @param {string} [opts.slug] Draft slug, named in the error so it is actionable.
 * @returns {{ ok: true } | { ok: false, gate: string, error: string }}
 */
export function assertInstagramHasImage({ channels, imageUrl, slug } = {}) {
  const wantsInstagram = (channels || []).some((ch) => ch?.platform === 'instagram');
  if (!wantsInstagram) return { ok: true };
  if (String(imageUrl || '').trim()) return { ok: true };

  return {
    ok: false,
    gate: 'instagram_requires_image',
    error:
      `Cannot schedule Instagram captions for "${slug}": the draft has no image_url yet, ` +
      'and Instagram rejects a feed post without an image. Attach and approve the header ' +
      'image first, then schedule captions. Scheduling now would queue posts that are ' +
      'guaranteed to fail on publish day.',
  };
}
