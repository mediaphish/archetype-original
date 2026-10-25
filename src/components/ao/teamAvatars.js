/**
 * Who Bart is talking to, at a glance. Bart, 2026-10-25: "Let's work them in so
 * there is a visual connect to who I'm talking to." Heads cropped from his
 * full-figure art for small round avatars.
 */
export const TEAM_AVATARS = {
  auto: '/images/team/auto.png',
  jot: '/images/team/jot.png',
  reach: '/images/team/reach.png',
};

export function avatarFor(agent) {
  return TEAM_AVATARS[agent] || TEAM_AVATARS.auto;
}
