/**
 * The brief standard (Bart, 2026-11-16).
 *
 * After a long thread where the team rebuilt the Abigail Archetype thesis five
 * times to dodge overlap warnings, Bart approved a brief built a different way
 * and asked for it to be "the structural reference for all future briefs.
 * Specifically in terms of depth of research, context inside and outside my
 * corpus, and demonstration of your own understanding of the subject." He also
 * said: "I need you to be the expert on some of this, but bring receipts. In
 * many ways, I'm building my own understanding of this field."
 *
 * The standard is a fixed text. The reference brief itself lives on the draft
 * marked metadata.brief.is_reference_brief (The Abigail Archetype), so it is
 * read only when someone is about to write a brief, not on every turn.
 */
import { contentDrafts } from '../../db/contentDrafts.js';

export const BRIEF_STANDARD = [
  'THE BRIEF STANDARD (Bart, 2026-11-16: "I need the team to work this way and to think and research more deeply before presenting a brief where everything has been researched and considered in context with the series and the corpus." And: "I need you to be the expert on some of this, but bring receipts. ... I\'m learning from the research and trying to make it my own.")',
  '',
  'A brief is the first thing Bart sees, and it arrives already researched. Do the research before you present it, not after he asks for depth. Present one settled brief. Never rebuild the thesis turn after turn to get around overlap flags: if the overlap is real, say so once and either own it or propose a different subject.',
  '',
  'Every brief has these parts, in this order (match the reference brief below for depth):',
  '1. THE ARCHETYPE. Who they are and the mechanism in a few sentences. Say who the reader is in this story (often the leader in the middle, not the one at the top).',
  '2. WHY THEY ARE POSITIVE (or NEGATIVE). Crystal clear, each point carried by a verse.',
  '3. WHY THE STORY EXISTS. Its purpose in the larger narrative of Scripture, and how it resolves in the text itself. A brief whose story does not resolve is not ready.',
  '4. THE WHOLE STORY, IN ORDER. Every beat cited to the verse (ESV text pulled, not remembered), including the parts readers overlook and what happens after the famous scene.',
  '5. WHAT THEY SAW OR KNEW, and what the text does and does not say about it.',
  '6. HARD QUESTIONS THE POST FACES PLAINLY. Anything a careful reader will notice. Never step around it, never invent an answer the text does not give.',
  '7. SERIES AND CORPUS CONTEXT. Every earlier entry, devotional and post that touches this subject, read in full (a name match is not an overlap), and in one line each how this piece differs. Leave material that belongs to a planned entry (for example the David series) for that entry.',
  '8. THE MODERN PARALLEL. Search widely and consider several candidates before choosing. For the one chosen: what happened, what historians say actually caused the outcome (including what they dispute), WHERE IT ALIGNS and WHERE IT MISSES, and where it sits in the post. If nothing holds up, say so; the post can go without one. Never force one. List the candidates set aside so nobody re-runs them.',
  '9. THE LEADERSHIP THREAD. Written straight to the reader most likely reading, in steps they can use on Monday, honest about the real risk (people lose jobs for speaking up).',
  '10. THE QUESTION THIS ARCHETYPE ASKS. A reckoning, not a slogan.',
  '11. SOURCES (RECEIPTS). Every claim carries its receipt: verse, author and title, or link. The Bible (ESV) and recognized commentaries and published histories only. No Wikipedia, no blog or search snippets as final sources.',
  '12. TO VERIFY. What still needs checking before the outline, named plainly.',
  '',
  'Show your understanding. Bart is building his own understanding of the field from this research, so explain why, not only what, the way an expert who has done the reading would. Then ask one question: whether he approves the brief.',
  '',
  'Bart\'s own story stays out of public writing unless he puts it in. Never name, describe or hint at a former partner, company or sale.',
].join('\n');

/** The standard plus the approved reference brief, for whoever is about to write one. */
export async function getReferenceBrief() {
  let reference = '';
  let title = '';
  try {
    const { data } = await contentDrafts()
      .select('title, metadata')
      .eq('metadata->brief->>is_reference_brief', 'true')
      .order('updated_at', { ascending: false })
      .limit(1);
    const row = data && data[0];
    reference = String(row?.metadata?.brief?.brief_text || '').trim();
    title = row?.title || '';
  } catch {
    // The standard alone still applies if the reference cannot be read.
  }
  return {
    ok: true,
    standard: BRIEF_STANDARD,
    reference_title: title || null,
    reference_brief: reference || '(The reference brief could not be read. Follow the standard above, and say so to Bart.)',
  };
}
