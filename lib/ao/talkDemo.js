/**
 * "Live from the room": the demo in Bart's Neosho talk (2026-10-28).
 *
 * Bart takes a photo of the room on his phone. On cue, each teammate does one
 * real job and says one line about what they actually did:
 *   Bit checks the connections (his real checks), Jot writes the post, Red
 *   edits it (a real second pass that changes something or says why not),
 *   Des looks at the real photo, Vox names the channels it goes to, Cam pulls
 *   it together, and Ada hands it to Bart. He says "post it" and it goes out
 *   for real, unless the talk is in rehearsal.
 *
 * Bart: "This is real." Three model calls in all, so it is quick and cheap.
 * See notes/PLAN-talk-mode.md.
 */
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../supabase-admin.js';
import { recordUsage, noteAiFailure } from './promptCache.js';
import { everydayModel } from './teamModels.js';
import { TEAM_VOICES } from './talkVoice.js';
import { bitFacts } from './talkAsk.js';
import { CARD_CHANNELS } from './scheduleQuoteCard.js';
import { getTalk } from './talks.js';

const BUCKET = 'ao-auto-attachments';
const CHANNEL_NAMES = {
  linkedin_personal: 'LinkedIn',
  instagram_business: 'the company Instagram',
  instagram_personal: 'his Instagram',
  facebook_business: 'the Facebook Page',
  twitter: 'X',
};

let client = null;
const anthropic = () => (client ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

async function ask({ system, content, maxTokens = 1500, source }) {
  const model = everydayModel();
  try {
    // Low effort keeps it quick on stage; the room is waiting. Room for thinking on top of the answer.
    const r = await anthropic().messages.create({ model, max_tokens: maxTokens + 4000, system, messages: [{ role: 'user', content }], output_config: { effort: 'low' } });
    if (r.stop_reason === 'max_tokens') console.warn(`[talkDemo] ${source} ran out of room`);
    recordUsage({ source: `talk:${source}`, model, usage: r.usage });
    return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  } catch (err) {
    noteAiFailure(err, `talk:${source}`);
    throw err;
  }
}

/** Pure: the first JSON object in a reply. */
export function jsonFrom(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

const noDash = (s) => String(s || '').replace(/\s*—\s*/g, ', ').trim();

/** Pure: captions that are safe to post: every channel present, X within 280, no em dashes. */
export function cleanCaptions(raw) {
  const out = {};
  for (const key of Object.keys(CARD_CHANNELS)) {
    let t = noDash(raw?.[key]);
    if (key === 'twitter' && t.length > 280) t = `${t.slice(0, 277).replace(/\s+\S*$/, '')}...`;
    if (!t) return null;
    out[key] = t;
  }
  return out;
}

/** A signed upload for the room photo, from the phone. */
export async function photoUploadTarget(mimeType = 'image/jpeg') {
  const path = `talk-photos/${crypto.randomUUID()}.jpg`;
  const signed = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data?.signedUrl) return { ok: false, error: signed.error?.message || 'Could not start the photo upload.' };
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, upload_url: signed.data.signedUrl, public_url: data.publicUrl, mime_type: mimeType };
}

/** The phone remote and the big screen share one small state on the talk. */
export async function setRemote(slug, patch) {
  const { data } = await supabaseAdmin.from('ao_talks').select('state').eq('slug', slug).maybeSingle();
  const prev = data?.state || {};
  const state = { ...prev, ...patch, seq: (Number(prev.seq) || 0) + 1, at: new Date().toISOString() };
  const { error } = await supabaseAdmin.from('ao_talks').update({ state }).eq('slug', slug);
  return error ? { ok: false, error: error.message } : { ok: true, state };
}

export async function getRemote(slug) {
  const { data } = await supabaseAdmin.from('ao_talks').select('state').eq('slug', slug).maybeSingle();
  return data?.state || {};
}

const VOICE_RULES =
  'Bart Paden, Archetype Original. His voice: plain, direct, warm, casual, never corporate. Short sentences. No em dashes, no hype words, no "game-changer", "unlock", "dive in". Never mention AI, tools, a team of assistants or how the post was made.';

/** The whole demo: the package and every teammate's line, in order. */
export async function runDemo({ slug, photoUrl }) {
  if (!/^https:\/\//.test(String(photoUrl || ''))) return { ok: false, error: 'No photo yet. Take it on the phone page.' };
  const talk = await getTalk(slug);
  const event = talk?.event || 'a Chamber of Commerce lunch and learn';
  const ideas = (talk?.sections || [])
    .filter((s) => s.kind !== 'demo' && s.lines?.length)
    .map((s) => `${s.title}: ${s.lines.join(' ')}`)
    .join('\n');
  const photo = { type: 'image', source: { type: 'url', url: photoUrl } };

  // Jot writes the post.
  const draftRaw = await ask({
    source: 'demo-jot',
    maxTokens: 1600,
    system: `You write social posts for ${VOICE_RULES}`,
    content: [
      photo,
      {
        type: 'text',
        text: `Bart is speaking right now at ${event}, on "${talk?.title || 'AI and Leadership'}". The photo is the room he is speaking to. Write the post that goes out with this photo, from Bart, about speaking here today: thanks to the room and the Chamber, and the one idea he most wants them to leave with, taken from his talk below. Each channel its own way, not one caption reworded. Instagram has no links. End each with three to five hashtags including #ServantLeadership #Leadership #ArchetypeOriginal. X under 260 characters.\n\nHis talk:\n${ideas}\n\nReturn JSON only: {"linkedin_personal":"","instagram_business":"","instagram_personal":"","facebook_business":"","twitter":"","idea":"the one idea, in a few words"}`,
      },
    ],
  });
  const draft = jsonFrom(draftRaw);
  const first = cleanCaptions(draft);
  if (!first) return { ok: false, error: 'The post did not come back whole. Try once more.' };

  // Red edits it: one real change, or a reason none was needed.
  const editRaw = await ask({
    source: 'demo-red',
    maxTokens: 1600,
    system: `You are Red, the editor. Literal and direct. You check posts for ${VOICE_RULES}`,
    content: `Edit these captions. Make the single most useful change, the line that is weakest, wordiest, or least like Bart, and leave the rest exactly as they are. If nothing needs changing, change nothing.\n\n${JSON.stringify(first)}\n\nReturn JSON only: {"captions":{same keys},"change":"what you changed and why, in one short plain sentence, or empty if nothing"}`,
  });
  const edit = jsonFrom(editRaw);
  const captions = cleanCaptions(edit?.captions) || first;
  const change = noDash(edit?.change || '');

  // Every teammate's line, from what really happened.
  const facts = await bitFacts({ connectionsOnly: true });
  const who = Object.entries(TEAM_VOICES)
    .map(([k, v]) => `${k}: ${v.talks}`)
    .join('\n');
  const linesRaw = await ask({
    source: 'demo-lines',
    maxTokens: 900,
    system:
      'You write the spoken lines for Bart Paden\'s team in a live demo on stage. Each teammate says one short line (under 22 words) about the job they just did, in their own personality, addressed to Bart or the room. Say only what is true below. Never invent a detail. No em dashes, no emoji.',
    content: [
      photo,
      {
        type: 'text',
        text: `Personalities:\n${who}\n\nWhat each one did (keys are fixed; each says only their own part):\n- it (Bit): checked the connections:\n${facts}\n- jot (Jot): wrote the post about speaking at ${event}. Its idea: ${noDash(draft?.idea || '')}.\n- editor (Red): edited it: ${change || 'read it and changed nothing'}. Only Red says \"you're welcome\".\n- designer (Des): looked at the photo above. Describe it truthfully, nothing that is not in it. Made no changes to it.\n- reach (Vox): picked where it goes: ${Object.values(CHANNEL_NAMES).join(', ')}, right now.\n- producer (Cam): pulled it together: the photo and five captions, one package, ready.\n- auto (Ada): hands it to Bart for his call.\n\nOrder: it, jot, editor, designer, reach, producer, auto.\nReturn JSON only: {"lines":[{"agent":"it","line":""},...]}`,
      },
    ],
  });
  const order = ['it', 'jot', 'editor', 'designer', 'reach', 'producer', 'auto'];
  const got = (jsonFrom(linesRaw)?.lines || []).filter((l) => order.includes(l.agent) && String(l.line || '').trim());
  const lines = order.map((a) => got.find((l) => l.agent === a)).filter(Boolean).map((l) => ({ agent: l.agent, line: noDash(l.line) }));

  return { ok: true, package: { photo_url: photoUrl, captions, idea: noDash(draft?.idea || ''), change }, lines };
}

/** Bart said post it. Live posts go out now; a rehearsal never posts. */
export async function postDemo({ package: pkg, rehearse = true }) {
  const captions = cleanCaptions(pkg?.captions);
  if (!captions || !/^https:\/\//.test(String(pkg?.photo_url || ''))) return { ok: false, error: 'The package is not complete.' };
  if (rehearse) return { ok: true, rehearsal: true, channels: Object.values(CHANNEL_NAMES) };
  const { insertScheduledPostsSafely } = await import('../db/scheduledPosts.js');
  const { publishPostById } = await import('../social/publish.js');
  const at = new Date(Date.now() - 1000).toISOString();
  const rows = Object.entries(CARD_CHANNELS).map(([key, ch]) => ({
    platform: ch.platform,
    account_id: ch.account_id,
    scheduled_at: at,
    text: captions[key],
    image_url: pkg.photo_url,
    status: 'scheduled',
    source_kind: 'talk_demo',
    ao_lane: 'Live demo',
    intent: { talk_demo: true },
  }));
  const ins = await insertScheduledPostsSafely(rows, { select: 'id, platform, account_id' });
  if (!ins.ok) return { ok: false, error: ins.error || 'Nothing was posted.' };
  const results = [];
  for (const r of ins.inserted) {
    const out = await publishPostById(r.id);
    results.push({ platform: r.platform, account_id: r.account_id, ok: Boolean(out.ok), error: out.error || null, external_id: out.externalId || null });
  }
  return { ok: results.some((r) => r.ok), results };
}
