/**
 * The live demo's room photo with a few of the team dropped in (2026-11-09).
 *
 * Bart: "When I take a picture of the people in the room. Can you insert drop
 * one...or a few of my AI Agents in the photo? Have them hanging out in the
 * room as if they are really there. It's a risk, but I think it's worth it."
 *
 * The room photo is the base; each teammate's art is a reference. Images are
 * one of the things OpenAI covers (Anthropic sells no image model). If the
 * edit fails or runs long, the demo goes on with the room photo as taken.
 */
import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';
import { getOpenAiKey } from '../openaiKey.js';
import { OPENAI_IMAGE_MODEL } from './imageModel.js';

const BUCKET = 'ao-auto-attachments';
const SITE = () => String(process.env.SITE_URL || 'https://www.archetypeoriginal.com').replace(/\/$/, '');

/** Who can appear, with the art file and a few words so the model draws them right. */
export const PHOTO_TEAM = Object.freeze({
  jot: { name: 'Jot', file: 'jot.png', look: 'a reporter in a brown fedora with a PRESS card, a vest and tie, holding a notepad and pencil' },
  it: { name: 'Bit', file: 'bit.png', look: 'a laid-back tech guy' },
  designer: { name: 'Des', file: 'des.png', look: 'a young, trendy designer' },
  reach: { name: 'Vox', file: 'reach.png', look: 'a bubbly, upbeat publicist' },
  editor: { name: 'Red', file: 'red.png', look: 'a cool, deadpan editor' },
  producer: { name: 'Cam', file: 'cam.png', look: 'a no-nonsense producer' },
  auto: { name: 'Ada', file: 'auto.png', look: 'a polished marketing director' },
});

/** Pure: two or three teammates, never the same set twice in a row by chance alone. */
export function pickTeammates(random = Math.random) {
  const keys = Object.keys(PHOTO_TEAM);
  const shuffled = keys.map((k) => [random(), k]).sort((a, b) => a[0] - b[0]).map(([, k]) => k);
  return shuffled.slice(0, random() < 0.5 ? 2 : 3);
}

/** Pure: the instruction for the edit. */
// 2026-11-09 first test: the old wording described image 1 as "a room of people
// at a Chamber of Commerce lunch". The photo was Bart's desk, and the model drew
// a whole new room of made-up people. Never describe the photo; only add.
export function teamPhotoPrompt(keys) {
  const who = keys.map((k, i) => `Image ${i + 2} is ${PHOTO_TEAM[k].name}, ${PHOTO_TEAM[k].look}.`).join(' ');
  return [
    'Edit image 1. Image 1 is a real photograph and must stay that photograph: every person, object, wall, table and detail stays exactly where it is, unchanged. Do not redraw, restage, replace or invent anything in it, and never add a real-looking person.',
    `The only change: add these cartoon characters into the scene in image 1, full body, as if they were really there, hanging out: ${who}`,
    'Draw each one in the cartoon style of their reference, at a believable size for where they stand, in open space (beside a wall, at the edge, at the back), never covering anyone\'s face. Match the photo\'s light and shadows.',
    'No text, captions, logos or watermarks.',
  ].join(' ');
}

/**
 * Pure-ish: how much of the photo changed, 0 to 1, on a small grayscale copy.
 * A few characters added change a part of it; a redrawn scene changes nearly
 * all of it, and is thrown away (2026-11-09: a made-up room of strangers).
 */
export async function shareChanged(before, after) {
  const sharp = (await import('sharp')).default;
  const small = (b) => sharp(b).resize(64, 48, { fit: 'fill' }).grayscale().raw().toBuffer();
  const [a, b] = await Promise.all([small(before), small(after)]);
  return photoChange(a, b).changed;
}

/**
 * Pure: on two same-size grayscale copies, the share of pixels that changed
 * and how alike the two are overall (1 is the same picture). The made-up room
 * of 2026-11-09 scored 59% changed and 0.03 alike.
 */
export function photoChange(a, b) {
  const n = Math.min(a.length, b.length);
  let changed = 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(a[i] - b[i]) > 40) changed += 1;
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let c = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    c += x * y;
    va += x * x;
    vb += y * y;
  }
  return { changed: changed / n, alike: va && vb ? c / Math.sqrt(va * vb) : 0 };
}

export async function compareToRoom(before, after) {
  const sharp = (await import('sharp')).default;
  const small = (b) => sharp(b).resize(64, 48, { fit: 'fill' }).grayscale().raw().toBuffer();
  const [a, b] = await Promise.all([small(before), small(after)]);
  return photoChange(a, b);
}

export const MIN_ALIKE = 0.6;
export const MAX_SHARE_CHANGED = 0.45;

async function fetchBuffer(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  return { buffer: Buffer.from(await r.arrayBuffer()), mime: r.headers.get('content-type') || 'image/png' };
}

/**
 * The room photo with teammates in it. Resolves { ok, photo_url, names } or
 * { ok: false } within timeoutMs; never throws.
 */
export async function addTeamToPhoto(photoUrl, { keys = pickTeammates(), timeoutMs = 75000 } = {}) {
  const key = getOpenAiKey();
  if (!key) return { ok: false, error: 'no image key' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [room, ...art] = await Promise.all([
      fetchBuffer(photoUrl),
      ...keys.map((k) => fetchBuffer(`${SITE()}/images/team/${PHOTO_TEAM[k].file}`)),
    ]);
    const form = new FormData();
    form.append('model', OPENAI_IMAGE_MODEL);
    form.append('prompt', teamPhotoPrompt(keys));
    form.append('n', '1');
    form.append('size', 'auto');
    form.append('quality', 'medium');
    form.append('image[]', new Blob([room.buffer], { type: room.mime }), 'room.jpg');
    art.forEach((a, i) => form.append('image[]', new Blob([a.buffer], { type: a.mime }), `${keys[i]}.png`));
    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });
    const j = await res.json().catch(() => ({}));
    const b64 = j?.data?.[0]?.b64_json;
    if (!res.ok || !b64) return { ok: false, error: j?.error?.message || `image ${res.status}` };
    const edited = Buffer.from(b64, 'base64');
    const { changed, alike } = await compareToRoom(room.buffer, edited);
    if (changed > MAX_SHARE_CHANGED || alike < MIN_ALIKE) return { ok: false, error: `the photo itself was redrawn (${Math.round(changed * 100)}% changed, ${alike.toFixed(2)} alike)`, changed, alike };
    const path = `talk-photos/team-${crypto.randomUUID()}.png`;
    const up = await supabaseAdmin.storage.from(BUCKET).upload(path, edited, { contentType: 'image/png', upsert: false });
    if (up.error) return { ok: false, error: up.error.message };
    const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
    return url ? { ok: true, photo_url: url, names: keys.map((k) => PHOTO_TEAM[k].name), changed, alike } : { ok: false, error: 'no url' };
  } catch (err) {
    return { ok: false, error: err?.name === 'AbortError' ? 'took too long' : err?.message || 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
