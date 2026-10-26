/**
 * Who Bart is talking to, at a glance. Bart, 2026-10-25: "Let's work them in so
 * there is a visual connect to who I'm talking to." Heads cropped from his
 * full-figure art for small round avatars.
 */
export const TEAM_AVATARS = {
  auto: '/images/team/auto.png',
  jot: '/images/team/jot.png',
  reach: '/images/team/reach.png',
  producer: '/images/team/cam.png',
};

/** A plain initial for a teammate whose art has not arrived yet (the Producer). */
function initialAvatar(letter) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#111827"/><text x="32" y="41" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function avatarFor(agent) {
  if (TEAM_AVATARS[agent]) return TEAM_AVATARS[agent];
  if (agent === 'producer') return initialAvatar('P');
  // Red has no art yet (2026-10-26).
  if (agent === 'editor') return initialAvatar('R');
  return TEAM_AVATARS.auto;
}
