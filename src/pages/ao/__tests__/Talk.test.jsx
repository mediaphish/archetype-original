/**
 * The talk view for the Neosho Chamber (2026-10-28): the clicker moves the
 * screens, and holding Back listens instead of going back.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Talk from '../Talk.jsx';

const talk = {
  slug: 'neosho-chamber-2026',
  title: 'AI and Leadership',
  sections: [
    { id: 'open', kind: 'slide', title: 'AI and Leadership', lines: ['Neosho Chamber of Commerce'] },
    { id: 'demo', kind: 'demo', title: 'Live from the room', lines: ['One photo. One request. A real post.'] },
    { id: 'trust', kind: 'slide', title: "I don't trust it", lines: ['You have to own it.'] },
  ],
};

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, talk }) }));
});
afterEach(() => {
  delete global.fetch;
  jest.useRealTimers();
});

test('Page Down and Page Up move between screens', async () => {
  render(<Talk />);
  await waitFor(() => expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'PageDown' });
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
  expect(screen.getByText('Live')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'PageUp' });
  fireEvent.keyUp(window, { key: 'PageUp' });
  expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument();
});

test('holding Back does not go back', async () => {
  jest.useFakeTimers();
  render(<Talk />);
  await act(async () => {
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('Neosho Chamber of Commerce')).toBeInTheDocument());
  fireEvent.keyDown(window, { key: 'PageDown' });
  fireEvent.keyDown(window, { key: 'PageUp' });
  act(() => {
    jest.advanceTimersByTime(600);
  });
  fireEvent.keyUp(window, { key: 'PageUp' });
  expect(screen.getByText('Live from the room')).toBeInTheDocument();
});
