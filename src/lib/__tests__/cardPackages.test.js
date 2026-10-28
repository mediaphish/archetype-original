import { cardPackages, parseCardPackages } from '../cardPackages.js';

// 2026-10-28: Bart had to match three stacked pictures to a stack of captions.
const SET = [
  '# Card 1: Thu, Nov 5, Who Signs for It?',
  'Quote: "A decision about a real person ends up with fingerprints all over it and a signature nowhere."',
  '',
  '## X, 9:30',
  'A decision about a real person ends up with fingerprints all over it.',
  '',
  '## LinkedIn Personal, 10:30',
  'She asked why her raise came in low.',
  '',
  '# Card 2: Tue, Nov 10, Before the Sun Sets',
  'Quote: "None of it feels like oppression from the leader\'s chair."',
  '',
  '## X, 9:30',
  'The approval that takes three weeks.',
].join('\n');

test('each card gets its own picture and all of its captions', () => {
  const imgs = [
    { label: 'Who Signs for It? card', url: 'https://x/old.png', addedAt: 1 },
    { label: 'Who Signs for It? card', url: 'https://x/new.png', addedAt: 2 },
    { label: 'Something else', url: 'https://x/other.png', addedAt: 3 },
  ];
  const [one, two] = cardPackages(SET, imgs);
  expect(one.title).toBe('Who Signs for It?');
  expect(one.image.url).toBe('https://x/new.png');
  expect(one.channels.map((c) => c.name)).toEqual(['X, 9:30', 'LinkedIn Personal, 10:30']);
  expect(one.quote).toMatch(/^A decision about a real person/);
  // No picture named for card 2: none is guessed by order.
  expect(two.title).toBe('Before the Sun Sets');
  expect(two.image).toBeNull();
  expect(two.channels).toHaveLength(1);
});

test('captions that are not split by card are left as they are', () => {
  expect(parseCardPackages('## X\nA caption')).toEqual([]);
});
