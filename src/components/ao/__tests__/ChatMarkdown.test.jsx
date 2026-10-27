import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMarkdown from '../ChatMarkdown.jsx';

// 2026-10-27: Des's quote cards showed as "!Before the Sun Sets card" links.
test('a picture in a message is drawn as the image; links and bold still work', () => {
  render(<ChatMarkdown text={'Here:\n![Before the Sun Sets card](https://x.supabase.co/a.png)\nSee [the post](https://archetypeoriginal.com/journal/x) and **this**.'} />);
  const img = screen.getByAltText('Before the Sun Sets card');
  expect(img.getAttribute('src')).toBe('https://x.supabase.co/a.png');
  expect(screen.getByText('the post').getAttribute('href')).toBe('https://archetypeoriginal.com/journal/x');
  expect(screen.getByText('this').tagName).toBe('STRONG');
  expect(screen.queryByText(/!Before/)).toBeNull();
});

test('only https pictures are drawn', () => {
  const { container } = render(<ChatMarkdown text={'![x](http://insecure/a.png)'} />);
  expect(container.querySelector('img')).toBeNull();
});
