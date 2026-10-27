/**
 * #queue in chat (Bart, 2026-10-27): one count in the sidebar, and every item
 * posted by the teammate who owns it, with its button right there.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueueChannelRow } from '../AutoV2Panel.jsx';
import QueueFeed from '../QueueFeed.jsx';

afterEach(() => {
  delete global.fetch;
});

test('the sidebar row shows the count, or caught up', () => {
  const open = jest.fn();
  const { rerender } = render(<QueueChannelRow count={3} onOpen={open} />);
  expect(screen.getByLabelText('3 waiting on you')).toHaveTextContent('3');
  fireEvent.click(screen.getByText('# queue'));
  expect(open).toHaveBeenCalled();
  rerender(<QueueChannelRow count={0} onOpen={open} />);
  expect(screen.getByText('caught up')).toBeInTheDocument();
});

test('questions and journal posts take him to their own conversation', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      count: 2,
      counts: { questions: 1, posts: 1 },
      questions: [{ id: 't1', agent: 'reach', title: 'Vox: next week', question: 'Tuesday or Thursday?', thread_id: 'th1' }],
      posts: [{ slug: 'the-josiah-archetype', title: 'The Josiah Archetype', step: 'schedule', label: 'The schedule is ready for your OK', thread_id: 'th2' }],
    }),
  }));
  const openThread = jest.fn();
  const onCount = jest.fn();
  render(<QueueFeed onOpenThread={openThread} onCount={onCount} />);
  await waitFor(() => expect(screen.getByText('Tuesday or Thursday?')).toBeInTheDocument());
  expect(screen.getByText(/2 waiting on you/)).toBeInTheDocument();
  expect(onCount).toHaveBeenCalledWith(2);
  fireEvent.click(screen.getByText('Answer'));
  expect(openThread).toHaveBeenCalledWith('th1');
  fireEvent.click(screen.getByText('Open the post'));
  expect(openThread).toHaveBeenCalledWith('th2');
});

test('nothing waiting says so', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, count: 0, counts: {}, questions: [], posts: [] }) }));
  render(<QueueFeed onOpenThread={() => {}} />);
  await waitFor(() => expect(screen.getByText(/Nothing is waiting on you/)).toBeInTheDocument());
});
