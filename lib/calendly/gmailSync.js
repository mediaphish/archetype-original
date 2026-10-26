/**
 * Bart's email with clients, filed on each client's timeline.
 *
 * From the CRM list Bart asked to have built (2026-10-24), item 1: client
 * replies stayed in his inbox, and check-ins did not stop on their own when
 * someone wrote back.
 *
 * How it connects: a small Google Apps Script in Bart's own Google account
 * (notes/gmail-sync/Code.gs) runs every fifteen minutes. It asks this site for
 * the list of client addresses, reads only messages to or from those
 * addresses, and posts them here. Google was not an option the direct way:
 * archetypeoriginal.com has no Google Cloud organization, so a read-only Gmail
 * connection would have needed Bart to approve it again every seven days.
 *
 * Who may post: the script proves it is Bart with a Google-signed identity
 * token for bart@archetypeoriginal.com. No password or shared key is stored
 * anywhere.
 *
 * What happens with a reply: it lands on the timeline (and counts as contact
 * for the health meter and gone-quiet), and if an approved check-in was about
 * to go out in the next seven days, that check-in is held so it does not cross
 * the reply. Bart gets a notice and can release it in Auto.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { normEmail } from './clientRecords.js';
import { contactFormRecipient } from '../contact-form-inbox.js';

const OWNER = 'bart@archetypeoriginal.com';
const DAY = 24 * 60 * 60 * 1000;
const MAX_BODY = 6000;

/** Check a Google identity token and return the verified email, or null. */
export async function verifiedGoogleEmail(idToken, { fetchImpl = fetch } = {}) {
  const t = String(idToken || '').trim();
  if (!t) return null;
  try {
    const res = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(t)}`);
    if (!res.ok) return null;
    const info = await res.json();
    const verified = info.email_verified === true || info.email_verified === 'true';
    if (!verified || Number(info.exp) * 1000 < Date.now()) return null;
    return normEmail(info.email);
  } catch {
    return null;
  }
}

export function isOwner(email) {
  const owners = new Set([OWNER, normEmail(contactFormRecipient())].filter(Boolean));
  return owners.has(normEmail(email));
}

/** Every client address the script should look for. */
export async function clientAddresses() {
  const { data, error } = await supabaseAdmin.from('engagement_inquiries').select('email').limit(2000);
  if (error) throw new Error(error.message);
  // Everyone in the CRM, not only people who booked (2026-10-25: podcast guests
  // and contacts are people Bart works with too, so their mail belongs on their timeline).
  const { data: people } = await supabaseAdmin.from('ao_clients').select('email').limit(5000);
  const all = [...(data || []), ...(people || [])];
  return [...new Set(all.map((r) => normEmail(r.email)).filter(Boolean))].filter((e) => !isOwner(e));
}

/** Pure: which client a message belongs to and which way it went, or null. */
export function classify(message, clients) {
  const set = clients instanceof Set ? clients : new Set(clients);
  const from = normEmail(message.from);
  const to = (message.to || []).map(normEmail);
  if (set.has(from)) return { email: from, kind: 'reply' };
  if (isOwner(from)) {
    const client = to.find((x) => set.has(x));
    if (client) return { email: client, kind: 'email_out' };
  }
  return null;
}

export function cleanBody(text) {
  return String(text || '')
    .replace(/\r/g, '')
    // Quoted earlier messages: the reply is what matters.
    .split(/\n(?:On .{5,200}wrote:|-{2,}\s*Original Message\s*-{2,})/i)[0]
    .replace(/^>.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_BODY);
}

async function alreadyFiled(ids) {
  if (!ids.length) return new Set();
  const { data } = await supabaseAdmin.from('ao_client_events').select('meta').in('meta->>gmail_id', ids);
  return new Set((data || []).map((r) => r.meta?.gmail_id).filter(Boolean));
}

/**
 * Hold approved check-ins due in the next week for this person, after they
 * wrote. Returns what was held so Bart can be told.
 */
export async function holdCheckinsAfterReply(email, repliedAt) {
  const { data } = await supabaseAdmin.from('engagement_inquiries').select('id, name, answers').ilike('email', email);
  const held = [];
  for (const row of data || []) {
    const plan = Array.isArray(row.answers?.checkin_plan) ? row.answers.checkin_plan : [];
    let changed = false;
    const next = plan.map((x) => {
      const due = Date.parse(x.send_at || '');
      if (x.status === 'approved' && due > Date.parse(repliedAt) && due - Date.parse(repliedAt) <= 7 * DAY) {
        changed = true;
        held.push({ name: row.name, send_at: x.send_at, subject: x.subject });
        return { ...x, status: 'held', held_at: new Date().toISOString(), held_reason: 'They wrote to you first.' };
      }
      return x;
    });
    if (changed) {
      await supabaseAdmin.from('engagement_inquiries').update({ answers: { ...row.answers, checkin_plan: next } }).eq('id', row.id);
    }
  }
  return held;
}

/**
 * File the messages the script sent. Each: { id, thread_id, from, to[], date,
 * subject, body }.
 */
export async function ingestMessages(messages) {
  const clients = new Set(await clientAddresses());
  const list = (Array.isArray(messages) ? messages : []).slice(0, 200);
  const done = await alreadyFiled(list.map((m) => String(m.id || '')).filter(Boolean));
  const filed = [];
  const held = [];
  for (const m of list) {
    const id = String(m.id || '');
    if (!id || done.has(id)) continue;
    const who = classify(m, clients);
    if (!who) continue;
    const at = new Date(Date.parse(m.date) || Date.now()).toISOString();
    const { error } = await supabaseAdmin.from('ao_client_events').insert({
      client_email: who.email,
      kind: who.kind,
      subject: String(m.subject || '').slice(0, 300) || null,
      body: cleanBody(m.body) || null,
      meta: { gmail_id: id, thread_id: m.thread_id || null, source: 'gmail' },
      at,
    });
    if (error) {
      console.error('[gmailSync] not filed:', error.message);
      continue;
    }
    done.add(id);
    filed.push({ email: who.email, kind: who.kind });
    if (who.kind === 'reply') held.push(...(await holdCheckinsAfterReply(who.email, at)));
  }
  return { filed, held };
}
