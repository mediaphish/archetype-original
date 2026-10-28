import { markdownTeamImages } from '../teamShownImages.js';

// 2026-10-28: Bart could not see the Nov 5 card beside its captions.
test("a card a teammate shows in chat is picked up for the panel; outside links are not", () => {
  const text = [
    'Des: The Nov 5 card is made.',
    '![Who Signs for It? card](https://cejecqtftkzyulzrtksx.supabase.co/storage/v1/object/public/ao-auto-attachments/auto-hub-quote-cards/plate-variation_13-1793203169532.png)',
    '![a chart](https://example.com/chart.png)',
  ].join('\n');
  const imgs = markdownTeamImages(text);
  expect(imgs).toHaveLength(1);
  expect(imgs[0].label).toBe('Who Signs for It? card');
  expect(imgs[0].url).toMatch(/plate-variation_13/);
  expect(markdownTeamImages('')).toEqual([]);
});
