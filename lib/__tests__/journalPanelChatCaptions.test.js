/**
 * @jest-environment node
 *
 * Captions that exist only in chat.
 *
 * "Your Tuesday", 2026-09-15: Auto wrote all seven captions in a chat message.
 * Nothing was saved as a captions draft and nothing was scheduled, so the
 * Captions tab showed "No captions yet". TUESDAY_MESSAGE is the caption portion
 * of that message, verbatim.
 */
import {
  extractCaptionTextsFromMarkdown,
  captionsFromChatText,
  findChatCaptionsMessage,
  mergeChatCaptions,
  buildCaptionsPanel,
} from '../ao/journalPanelData.js';

const TUESDAY_MESSAGE = `Draft is approved, has the image, but nothing scheduled yet.

**Recommended times (from your actual engagement history, not fallback defaults):**
- LinkedIn: 10:30am CT
- Facebook: 1:30pm CT

**LinkedIn Personal:**
Nick Saban told a reporter his morning routine once: let the dog out, a cup of coffee, two Little Debbie cookies.

What did you actually do on yours?

Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership #Leadership #ArchetypeOriginal #TransformationalLeadership

**LinkedIn Business (manual paste):**
The organizations that hold a standard under pressure are rarely the ones with the best slogan. Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership #Leadership #ArchetypeOriginal #OrganizationalCulture

**Instagram Business:**
Nick Saban's actual morning routine: let the dog out, coffee, two Little Debbie cookies. Full post is up now, link in bio.

#ServantLeadership #Leadership #ArchetypeOriginal #NickSaban #TransformationalLeadership #TrustAndLeadership #DailyDiscipline

**Facebook Business:**
Nick Saban's whole method, boiled down: coffee, two Little Debbie cookies. What does your Tuesday actually look like? Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership #Leadership #ArchetypeOriginal

**X:**
Saban gave himself 24 hours to feel anything about a result, win or loss. https://archetypeoriginal.com/journal/your-tuesday

#Leadership #ServantLeadership #ArchetypeOriginal

**Facebook Personal (manual paste):**
Wrote something this week I actually lived, not just researched. Full post: https://archetypeoriginal.com/journal/your-tuesday

#ServantLeadership #Leadership #ArchetypeOriginal #Reflection

**Instagram Personal:**
Real talk: I miss running my old team more than I miss almost anything else from that season of life. New post is up, link in bio if you want the whole thing.

#ServantLeadership #Leadership #ArchetypeOriginal #Reflection #Culture

Want me to schedule these five automated channels now for tomorrow at the times above, and lock the journal's publish time to match?`;

describe('extractCaptionTextsFromMarkdown on the real Your Tuesday message', () => {
  const out = extractCaptionTextsFromMarkdown(TUESDAY_MESSAGE);

  it('finds all seven channels', () => {
    expect(Object.keys(out).sort()).toEqual([
      'facebook_business',
      'facebook_personal',
      'instagram_business',
      'instagram_personal',
      'linkedin_business',
      'linkedin_personal',
      'twitter',
    ]);
  });

  it('reads headers with a "(manual paste)" note', () => {
    expect(out.linkedin_business).toMatch(/^The organizations that hold a standard/);
    expect(out.facebook_personal).toMatch(/^Wrote something this week/);
  });

  it('does not treat the "Recommended times" header as a caption', () => {
    expect(Object.values(out).some((t) => t.includes('10:30am CT'))).toBe(false);
  });

  it('ends the last caption at its hashtags, not at the question to Bart', () => {
    expect(out.instagram_personal.endsWith('#Culture')).toBe(true);
    expect(out.instagram_personal).not.toContain('Want me to schedule');
  });

  it('keeps multi-paragraph captions whole', () => {
    expect(out.linkedin_personal).toContain('What did you actually do on yours?');
    expect(out.linkedin_personal.endsWith('#TransformationalLeadership')).toBe(true);
  });
});

describe('findChatCaptionsMessage', () => {
  const cainCaptions =
    '**LinkedIn Personal:**\nCain caption.\nhttps://archetypeoriginal.com/journal/the-cain-archetype\n#Leadership\n\n**X:**\nCain on X.\n#Leadership';

  it('finds the message holding captions for this post', () => {
    const messages = [
      { role: 'assistant', content: 'Here is the post.' },
      { role: 'assistant', content: TUESDAY_MESSAGE },
      { role: 'user', content: 'This goes out Wednesday.' },
    ];
    expect(findChatCaptionsMessage(messages, { slug: 'your-tuesday' })).toBe(TUESDAY_MESSAGE);
  });

  it("never returns another post's captions from earlier in the thread", () => {
    const messages = [{ role: 'assistant', content: cainCaptions }];
    expect(findChatCaptionsMessage(messages, { slug: 'your-tuesday', title: 'Your Tuesday' })).toBeNull();
  });

  it('prefers the newest caption set for the post', () => {
    const newer = TUESDAY_MESSAGE.replace('Real talk:', 'Revised:');
    const messages = [
      { role: 'assistant', content: TUESDAY_MESSAGE },
      { role: 'assistant', content: newer },
    ];
    expect(findChatCaptionsMessage(messages, { slug: 'your-tuesday' })).toBe(newer);
  });

  it('ignores a passing mention that is not a caption set', () => {
    const messages = [
      { role: 'assistant', content: 'LinkedIn is not syncing. https://archetypeoriginal.com/journal/your-tuesday' },
    ];
    expect(findChatCaptionsMessage(messages, { slug: 'your-tuesday' })).toBeNull();
  });
});

describe('mergeChatCaptions', () => {
  it('fills every empty channel from chat and marks it as chat', () => {
    const merged = mergeChatCaptions(buildCaptionsPanel({}), TUESDAY_MESSAGE);
    expect(merged.every((c) => c.text)).toBe(true);
    expect(merged.every((c) => c.source === 'chat')).toBe(true);
  });

  it('never replaces scheduled text, which is what will post', () => {
    const scheduled = buildCaptionsPanel({
      scheduledRows: [
        {
          platform: 'linkedin',
          caption: 'The scheduled LinkedIn caption',
          intent: { channel_label: 'linkedin_personal' },
        },
      ],
    });
    const merged = mergeChatCaptions(scheduled, TUESDAY_MESSAGE);
    expect(merged.find((c) => c.key === 'linkedin_personal')).toMatchObject({
      text: 'The scheduled LinkedIn caption',
      source: 'scheduled',
    });
    expect(merged.find((c) => c.key === 'twitter').source).toBe('chat');
  });

  it('returns the captions unchanged with no chat text', () => {
    const base = buildCaptionsPanel({});
    expect(mergeChatCaptions(base, '')).toEqual(base);
  });

  it('builds a full channel list when the server sent none', () => {
    expect(mergeChatCaptions(null, TUESDAY_MESSAGE)).toHaveLength(7);
  });
});

describe('captionsFromChatText', () => {
  it('reads the tag format as well', () => {
    const tagged =
      '[SOCIAL_CAPTIONS]\n[CAPTION platform="twitter"]Tagged X caption[/CAPTION]\n[CAPTION platform="linkedin_personal"]Tagged LI[/CAPTION]\n[/SOCIAL_CAPTIONS]';
    expect(captionsFromChatText(tagged)).toMatchObject({ twitter: 'Tagged X caption', linkedin_personal: 'Tagged LI' });
  });
});
