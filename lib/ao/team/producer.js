/**
 * The Producer: the teammate who runs the podcast flow (notes/PLAN-auto-team.md,
 * PLAN-podcast-pipeline.md). Bart, 2026-10-25: "We also need to weave a plan
 * for getting some Podcasts recorded inside this agentized setup. I have several
 * interviews and mentorships I can start recording."
 *
 * Prep runs on the generators that already exist (lib/ao/generateGuestResearch.js),
 * so there is one research generator, not two. Show notes follow the settled
 * structure: each guest's opening carried forward word for word from their
 * producer brief, then the through-line, the moves, the questions, what to avoid.
 */
import { supabaseAdmin } from '../../supabase-admin.js';
import {
  getGuestById,
  getGuestsByIds,
  updateGuestResearch,
  updateGuestQuestions,
  updateGuestProducerBrief,
} from '../guestIntakeStore.js';
import {
  generateGuestResearchBrief,
  generateGuestSuggestedQuestions,
  generateGuestProducerBrief,
} from '../generateGuestResearch.js';

/** Who is in the pipeline and how far their prep has got. */
export async function listPodcastGuests({ includeArchived = false } = {}) {
  let q = supabaseAdmin
    .from('ao_podcast_guests')
    .select('id, name, company, session_type, submitted_at, release_agreed, research_brief, producer_brief, suggested_questions, episode_thread_id, archived_at')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(40);
  if (!includeArchived) q = q.is('archived_at', null);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    guests: (data || []).map((g) => ({
      id: g.id,
      name: g.name,
      company: g.company || null,
      track: g.session_type === 'mentor' ? 'mentor session' : 'interview',
      submitted: g.submitted_at ? String(g.submitted_at).slice(0, 10) : null,
      release_agreed: !!g.release_agreed,
      prep: {
        research: !!g.research_brief,
        questions: !!g.suggested_questions,
        producer_brief: !!g.producer_brief,
      },
      prepared: !!(g.research_brief && g.suggested_questions && g.producer_brief),
      archived: !!g.archived_at,
    })),
  };
}

/** Run every missing prep step for one guest: research, then questions, then the producer brief. */
export async function prepareGuest(guestId, opts = {}) {
  try {
    return await prepareGuestSteps(guestId, opts);
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function prepareGuestSteps(guestId, { redo = false } = {}) {
  const found = await getGuestById(guestId);
  if (!found?.ok || !found.guest) return { ok: false, error: found?.error === 'guest_not_found' ? 'Guest not found' : found?.error || 'Guest not found' };
  let g = found.guest;
  const steps = [];
  // A step that cannot save stops here and says so, rather than letting the
  // next step run on nothing (2026-10-25: research "ran three times and saved nothing").
  const keep = (saved, what) => {
    if (!saved?.ok || !saved.guest) throw new Error(`${what} was written but could not be saved: ${saved?.error || 'unknown error'}`);
    return saved.guest;
  };

  if (redo || !g.research_brief) {
    const r = await generateGuestResearchBrief(g);
    if (!r.ok) return { ok: false, error: `Research: ${r.error}`, steps };
    g = keep(await updateGuestResearch(g.id, { research_brief: r.research_brief }), 'The research');
    steps.push('research');
  }
  if (redo || !g.suggested_questions) {
    const r = await generateGuestSuggestedQuestions(g);
    if (!r.ok) return { ok: false, error: `Questions: ${r.error}`, steps };
    g = keep(await updateGuestQuestions(g.id, { suggested_questions: r.suggested_questions }), 'The questions');
    steps.push('questions');
  }
  if (redo || !g.producer_brief) {
    const r = await generateGuestProducerBrief(g);
    if (!r.ok) return { ok: false, error: `Producer brief: ${r.error}`, steps };
    g = keep(await updateGuestProducerBrief(g.id, { producer_brief: r.producer_brief }), 'The producer brief');
    steps.push('producer brief');
  }

  return {
    ok: true,
    guest: g.name,
    track: g.session_type === 'mentor' ? 'mentor session' : 'interview',
    steps_run: steps,
    already_prepared: steps.length === 0,
    opening: personInOneParagraph(g.producer_brief),
  };
}

/**
 * The opening Bart reads aloud, lifted from the producer brief's first section.
 * It travelled from brief to air almost unchanged on the Theis episode, so it is
 * carried forward, never rewritten.
 */
export function personInOneParagraph(producerBrief) {
  const text = String(producerBrief || '');
  const m = text.match(/THE PERSON IN ONE PARAGRAPH[^\n]*\n+([\s\S]*?)(?=\n\s*(?:\*\*|#+\s*)?\s*2\.\s|\n\s*(?:\*\*|#+\s*)?WHERE THE BEST MATERIAL|$)/i);
  return m ? m[1].replace(/^\s*[*#]+\s*/gm, '').trim() : '';
}

/**
 * Write show notes (a run sheet to glance at on camera) for one or more
 * guests, and keep them on an episode draft so they are not chat-only.
 */
export async function writeShowNotes({ guestIds = [], workingTitle = '', email = null } = {}) {
  const ids = (Array.isArray(guestIds) ? guestIds : [guestIds]).filter(Boolean);
  if (!ids.length) return { ok: false, error: 'guest_ids is required' };
  const found = await getGuestsByIds(ids);
  const guests = found?.ok ? found.guests : [];
  if (!guests.length) return { ok: false, error: found?.error || 'No guests found' };
  const unprepared = guests.filter((g) => !g.producer_brief);
  if (unprepared.length) {
    return { ok: false, error: `Prepare first: ${unprepared.map((g) => g.name).join(', ')} has no producer brief yet. Run podcast_prepare_guest.` };
  }

  const openings = guests.map((g) => ({ name: g.name, text: personInOneParagraph(g.producer_brief) }));
  const { completeText } = await import('../textModel.js');
  const material = guests
    .map(
      (g) =>
        `### ${g.name} (${g.session_type === 'mentor' ? 'mentor session' : 'interview'})\n\nPRODUCER BRIEF:\n${g.producer_brief}\n\nRESEARCH:\n${String(g.research_brief || '').slice(0, 6000)}\n\nSUGGESTED QUESTIONS:\n${JSON.stringify(g.suggested_questions || {}).slice(0, 4000)}`
    )
    .join('\n\n---\n\n');

  const prompt = `You are the producer of The Archetype Original Podcast, writing show notes for Bart Paden to run the conversation from. They are a run sheet he glances at while looking at a person on camera, not a summary.

Guests: ${guests.map((g) => g.name).join(', ')}.

Write these sections, in this order, with these headings:
THE THROUGH-LINE: ${guests.length > 1 ? 'why these people are in one room, in one sentence.' : 'what this conversation is really about, in one sentence.'}
THE CONVERSATION MOVES: four or five, in order, one line each.
THE QUESTIONS: the ones that matter, deduplicated, throwaways cut${guests.length > 1 ? ', including ones that only exist because they are together' : ''}. Short, spoken, one per line.
WHAT TO AVOID: two or three lines.

Do not write the openings; they are added separately, word for word. Plain words, Bart's voice, no em dashes, no hype.

MATERIAL:
${material}`;

  const generated = String((await completeText({ prompt, task: 'draft', maxTokens: 16000, timeoutMs: 240000 })) || '').trim();
  if (!generated) return { ok: false, error: 'The show notes came back empty' };

  const showNotes = [
    '## THE OPENINGS',
    ...openings.map((o) => `**${o.name}**\n\n${o.text || '(No opening paragraph found in the producer brief.)'}`),
    '',
    generated,
  ].join('\n\n');

  // Keep them on an episode draft, one per set of guests.
  const owner = String(email || process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com').toLowerCase();
  const sortedIds = [...ids].sort();
  const { data: existing } = await supabaseAdmin
    .from('ao_episode_drafts')
    .select('id, guest_ids, status')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(30);
  const match = (existing || []).find((e) => JSON.stringify([...(e.guest_ids || [])].sort()) === JSON.stringify(sortedIds));
  const title = String(workingTitle || '').trim() || `Episode with ${guests.map((g) => g.name).join(' and ')}`;
  let episodeId = match?.id || null;
  if (episodeId) {
    await supabaseAdmin.from('ao_episode_drafts').update({ show_notes: showNotes, updated_at: new Date().toISOString() }).eq('id', episodeId);
  } else {
    const { data: created, error } = await supabaseAdmin
      .from('ao_episode_drafts')
      .insert({
        created_by_email: owner,
        status: 'draft',
        episode_type: 'guest',
        title,
        show_notes: showNotes,
        guest_ids: ids,
        guest_id: ids.length === 1 ? ids[0] : null,
        meta: { stage: 'planned', planned_by: 'producer' },
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message, show_notes: showNotes };
    episodeId = created.id;
  }
  return { ok: true, episode_draft_id: episodeId, title, show_notes: showNotes };
}

export async function guestForTask(guestId) {
  const found = await getGuestById(guestId);
  return found?.ok ? found.guest : null;
}
