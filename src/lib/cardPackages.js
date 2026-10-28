/**
 * A caption set split into one package per card, each paired with its picture.
 *
 * Bart, 2026-10-28: "There are three images stacked at the top, and underneath
 * it ... the captions are written out and stacked as well ... it needs to be a
 * single image with all the captions." The team writes caption sets as
 *
 *   # Card 1: Thu, Nov 5, Who Signs for It?
 *   Quote: "..."
 *   ## X, 9:30
 *   caption...
 *
 * and shows each card as a picture labelled with its title. A picture is
 * paired by title only, never by order: a wrong pairing is worse than none.
 */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Pure: [{ number, heading, title, quote, channels: [{ name, text }] }], or [] if the text is not card-shaped. */
export function parseCardPackages(content) {
  const text = String(content || '');
  const parts = text.split(/^#\s+Card\s+(?=\d+\s*:)/im).slice(1);
  return parts.map((part) => {
    const [first, ...rest] = part.split('\n');
    const m = /^(\d+)\s*:\s*(.*)$/.exec(first.trim());
    const number = m ? Number(m[1]) : null;
    const heading = m ? m[2].trim() : first.trim();
    // "Thu, Nov 5, Who Signs for It?" -> "Who Signs for It?"
    const title = heading.replace(/^(?:[A-Za-z]{3,9},\s*)?(?:[A-Za-z]{3,9}\.?\s+\d{1,2},\s*)?/, '').trim() || heading;
    const body = rest.join('\n');
    const quoteMatch = /^Quote:\s*(.+)$/im.exec(body);
    const quote = quoteMatch ? quoteMatch[1].trim().replace(/^["“]|["”]$/g, '') : '';
    const channels = body
      .split(/^##\s+/m)
      .slice(1)
      .map((chunk) => {
        const [name, ...lines] = chunk.split('\n');
        return { name: name.trim(), text: lines.join('\n').trim() };
      })
      .filter((c) => c.name && c.text);
    return { number, heading, title, quote, channels };
  });
}

/** Pure: the newest picture whose label names the card's title, or null. */
export function imageForCard(card, images) {
  const t = norm(card?.title);
  if (!t) return null;
  const matches = (images || []).filter((img) => norm(img?.label).includes(t));
  if (!matches.length) return null;
  return matches.reduce((a, b) => ((b.addedAt || 0) > (a.addedAt || 0) ? b : a));
}

/** Pure: packages with their picture, ready for the panel. */
export function cardPackages(content, images) {
  return parseCardPackages(content).map((card) => ({ ...card, image: imageForCard(card, images) }));
}
