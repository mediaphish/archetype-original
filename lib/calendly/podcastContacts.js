/**
 * Every podcast guest and mentor is a contact in the CRM.
 * Bart, 2026-10-25: "Please make sure all guests are added to the CRM. Even
 * without a tier locked in, they are still contacts that I will want my team
 * to follow up on."
 *
 * A guest gets an ao_clients record at stage "contact" (never overwriting a
 * stage or name Bart already has for them), a podcast_guest flag the next moves
 * read, and one podcast_intake event dated when they signed up, so follow-up
 * timing counts from then.
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { normEmail, getClientRecord, upsertClientRecord } from './clientRecords.js';

export async function addGuestAsContact(guest) {
  const email = normEmail(guest?.email);
  if (!email) return { ok: false, skipped: 'no email' };
  const existing = await getClientRecord(email);
  const track = guest.session_type === 'mentor' ? 'mentor session' : 'interview';
  const flags = existing?.flags && typeof existing.flags === 'object' ? existing.flags : {};
  const podcast = {
    ...(flags.podcast_guest || {}),
    guest_id: guest.id,
    track,
    submitted_at: guest.submitted_at || guest.created_at || null,
  };
  await upsertClientRecord(email, {
    name: existing?.name || guest.name || email,
    phone: existing?.phone || guest.phone || null,
    stage: existing?.stage || 'contact',
    flags: { ...flags, podcast_guest: podcast },
  });

  const { data: seen } = await supabaseAdmin
    .from('ao_client_events')
    .select('id')
    .eq('client_email', email)
    .eq('kind', 'podcast_intake')
    .limit(1);
  if (!seen?.length) {
    await supabaseAdmin.from('ao_client_events').insert({
      client_email: email,
      kind: 'podcast_intake',
      subject: `Signed up for a podcast ${track}`,
      body: guest.company ? `${guest.name}, ${guest.company}` : guest.name || null,
      meta: { guest_id: guest.id, track },
      at: podcast.submitted_at || new Date().toISOString(),
    });
  }
  return { ok: true, email, created: !existing };
}

/** Bring every guest on file into the CRM. Safe to run again: it only fills gaps. */
export async function syncPodcastGuestsToCrm() {
  const { data, error } = await supabaseAdmin
    .from('ao_podcast_guests')
    .select('id, name, email, phone, company, session_type, submitted_at, created_at, archived_at')
    .limit(500);
  if (error) return { ok: false, error: error.message };
  let added = 0;
  let updated = 0;
  for (const g of data || []) {
    // A guest whose episode is finished is not brought back into the CRM.
    if (g.archived_at) continue;
    try {
      const r = await addGuestAsContact(g);
      if (r.ok && r.created) added += 1;
      else if (r.ok) updated += 1;
    } catch (err) {
      console.warn('[podcastContacts] could not add', g.id, err?.message || err);
    }
  }
  return { ok: true, added, updated };
}
