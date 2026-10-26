/**
 * The only photos a journal reshare may use: Bart's own approved set.
 *
 * Bart, 2026-10-24, after rejecting an OpenAI-relit photo of himself ("It is
 * exactly what I was afraid of"), sent ten backgrounds and said: "Please note
 * the left and right shift. Also, I need you to lock Auto out of touching the
 * image themselves. All it can do is add the text in style with the brand. ...
 * The font has weight. The AO logo always in the bottom corner."
 *
 * So each photo is drawn exactly as he made it, full frame, never edited,
 * cropped, relit or sent to an image model. `text` is the open side, opposite
 * where Bart is, and it is where the quote and the logo go. To add a photo:
 * put the PNG (1536 x 1024) in public/images/reshare-backgrounds/ and add a
 * line here with the side that is open.
 *
 * 002 is left out on purpose (Bart, 2026-10-24: "It reads as a duplicate and
 * is the lesser quality image" of 001). The file stays on disk, unused.
 *
 * 2026-10-25: 012 to 021 added ("Add them all. Rotate thru randomly."). Each
 * photo carries its scene and mood so a quote can go on the photo that fits it.
 */

export const BACKGROUNDS = [
  { id: 'bart-reshare-001', text: 'left', scene: 'at a desk working on a laptop late in a dark loft office', mood: 'focus, discipline, doing the work, building, responsibility' },
  { id: 'bart-reshare-003', text: 'right', scene: 'standing on a wooded ridge above a valley at sunset', mood: 'perspective, reflection, faith, stepping back, the long view' },
  { id: 'bart-reshare-004', text: 'left', scene: 'reading barefoot in a beach chair at sunset', mood: 'rest, Sabbath, peace, renewal, slowing down, trust' },
  { id: 'bart-reshare-005', text: 'right', scene: 'walking through an empty industrial building', mood: 'purpose, movement, moving forward, resolve, change' },
  { id: 'bart-reshare-006', text: 'left', scene: 'writing in a notebook at a cafe table', mood: 'reflection, journaling, thinking it through, honesty, self-examination' },
  { id: 'bart-reshare-007', text: 'right', scene: 'walking alone down a rain-wet city street at night', mood: 'steadiness, standing firm, integrity, walking your own way, perseverance' },
  { id: 'bart-reshare-008', text: 'right', scene: 'on a rooftop terrace above the city at dusk', mood: 'vision, looking ahead, hope, the future, influence' },
  { id: 'bart-reshare-009', text: 'left', scene: 'seated in a chair, hand to chin, thinking', mood: 'wisdom, counsel, weighing a decision, listening, patience' },
  { id: 'bart-reshare-010', text: 'right', scene: 'walking a rocky lakeshore in autumn', mood: 'solitude, prayer, seasons, quiet strength, recovery' },
  { id: 'bart-reshare-011', text: 'left', scene: 'reading a book in a leather chair in a library', mood: 'learning, Scripture, wisdom, being teachable, humility' },
  { id: 'bart-reshare-012', text: 'left', scene: 'walking a busy city sidewalk at dusk among blurred crowds', mood: 'steady in the rush, calm under pressure, presence, consistency' },
  { id: 'bart-reshare-013', text: 'right', scene: 'standing at the edge of a busy open-plan workplace', mood: 'culture, the team, being present with people, trust, environment' },
  { id: 'bart-reshare-014', text: 'left', scene: 'on a train platform checking his watch among travelers', mood: 'timing, waiting, transitions, urgency versus patience, seasons of change' },
  { id: 'bart-reshare-015', text: 'right', scene: 'writing on papers at a table in a busy office', mood: 'planning, decisions, accountability, clarity, getting it right' },
  { id: 'bart-reshare-016', text: 'left', scene: 'walking through an airport concourse with a bag', mood: 'journey, change, going where you are sent, new chapters, courage' },
  { id: 'bart-reshare-017', text: 'right', scene: 'leaning on a cafe counter with coffee and a phone', mood: 'everyday faithfulness, ordinary moments, conversations, communication, connection' },
  { id: 'bart-reshare-018', text: 'left', scene: 'walking through a workshop where people build things', mood: 'craft, hard work, building something lasting, serving the people who do the work' },
  { id: 'bart-reshare-019', text: 'right', scene: 'walking through a busy indoor hall among people', mood: 'leading among people, humility, servant leadership, walking with the team' },
  { id: 'bart-reshare-020', text: 'left', scene: 'standing by his desk in a dark office over the city at night, looking out', mood: 'the weight of leadership, responsibility, late-night thinking, carrying people, stewardship' },
  { id: 'bart-reshare-021', text: 'right', scene: 'walking a rainy city sidewalk at dusk past dark storefronts', mood: 'endurance, keeping going, faithfulness in hard seasons, resolve, alone with your thoughts' },
];

export const BACKGROUND_DIR = 'public/images/reshare-backgrounds';

export function backgroundFile(id) {
  return `${BACKGROUND_DIR}/${id}.png`;
}

/**
 * Pure: the photos that may come next. Anything used in the last few reshares
 * waits its turn, so the same photo never shows twice close together.
 */
export function availableBackgrounds(recentIds = [], list = BACKGROUNDS, holdBack = Math.min(8, Math.floor(list.length / 2))) {
  const recent = new Set(recentIds.slice(0, holdBack));
  const open = list.filter((b) => !recent.has(b.id));
  return open.length ? open : list;
}

/**
 * Pure: a random photo from those that may come next, preferring the ones
 * whose mood fits (fitIds, best first). Bart, 2026-10-25: "Rotate thru
 * randomly." and "If we can align the image style that best fits the content
 * that would be super cool."
 */
export function pickBackground(recentIds = [], list = BACKGROUNDS, { fitIds = [], rand = Math.random } = {}) {
  const open = availableBackgrounds(recentIds, list);
  const fitting = fitIds.map((id) => open.find((b) => b.id === id)).filter(Boolean).slice(0, 3);
  const pool = fitting.length ? fitting : open;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

/** What the reader sees when matching a quote to a photo. */
export function backgroundMenu(list = BACKGROUNDS) {
  return list.map((b) => `${b.id}: Bart ${b.scene}. Feels like: ${b.mood}.`).join('\n');
}

/**
 * The photo for a reshare: the reader names the photos whose mood fits the
 * quote best, then one of them is picked at random among those not used
 * lately. The reader only chooses from the list; it never sees or touches a
 * photo. If it cannot run, the pick is simply random.
 */
export async function chooseBackgroundFor({ title = '', quote = '', recentIds = [], complete = null } = {}, list = BACKGROUNDS) {
  const open = availableBackgrounds(recentIds, list);
  let fitIds = [];
  if (String(quote || title).trim()) {
    try {
      const ask = complete || (await import('./textModel.js')).completeJson;
      const raw = await ask({
        task: 'classify',
        maxTokens: 400,
        timeoutMs: 20000,
        prompt: `Pick the photos whose scene and mood best fit this quote from Bart Paden's writing. Choose only from this list.\n\n${backgroundMenu(open)}\n\nPiece: ${title}\nQuote: "${quote}"\n\nReturn JSON only: { "best": ["up to three ids, best fit first"] }`,
      });
      const ids = new Set(open.map((b) => b.id));
      fitIds = (Array.isArray(raw?.best) ? raw.best : []).map((x) => String(x).trim()).filter((x) => ids.has(x));
    } catch (err) {
      console.warn('[reshare] photo match did not run, picking at random:', err?.message || err);
    }
  }
  return pickBackground(recentIds, list, { fitIds });
}
