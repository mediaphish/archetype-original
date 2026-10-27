import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThreadSidebar } from '../AutoV2Panel';

/**
 * Phase 1 (2026-10-26): the chat list is grouped by channel, each with a way to
 * start a thread there, and any thread can be moved to another channel.
 */
const channels = {
  standing: [
    { key: 'general', name: 'general', lead: 'auto', purpose: 'Anything.', kind: 'standing' },
    { key: 'social', name: 'social', lead: 'reach', purpose: 'Posts.', kind: 'standing' },
  ],
  projects: [{ key: 'ai-and-leadership', name: 'AI & Leadership', lead: 'jot', purpose: 'The series.', kind: 'project' }],
};
const now = new Date().toISOString();
const threads = [
  { id: 't1', title: 'Quote card numbers', state: { channel: 'social' }, updated_at: now },
  { id: 't2', title: 'Plain old chat', state: {}, updated_at: now },
  { id: 't3', title: 'Old chat with Jot', state: { agent: 'jot' }, updated_at: now },
];

function renderSidebar(extra = {}) {
  const props = {
    threads,
    archivedThreads: [],
    activeThreadId: 't1',
    onSelectThread: jest.fn(),
    onNewThread: jest.fn(),
    onRefresh: jest.fn(),
    channels,
    onNewInChannel: jest.fn(),
    onMoveThread: jest.fn(),
    onNewChannel: jest.fn(),
    ...extra,
  };
  render(<ThreadSidebar {...props} />);
  return props;
}

const openChannel = (name) => fireEvent.click(screen.getByRole('button', { name: `Show conversations in #${name}` }));

describe('ThreadSidebar with channels', () => {
  it('groups threads under their channels and projects', () => {
    renderSidebar();
    expect(screen.getByText('# social')).toBeInTheDocument();
    expect(screen.getByText('# general')).toBeInTheDocument();
    expect(screen.getByText('# AI & Leadership')).toBeInTheDocument();
    expect(screen.getByText('Quote card numbers')).toBeInTheDocument();
    openChannel('general');
    expect(screen.getByText('Plain old chat')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('shows one line per channel, with conversations only for the one in use', () => {
    renderSidebar();
    // t1 (#social) is open, so #social shows its conversations and #general folds.
    expect(screen.getByText('Quote card numbers')).toBeInTheDocument();
    expect(screen.queryByText('Plain old chat')).toBeNull();
    openChannel('general');
    expect(screen.getByText('Plain old chat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide conversations in #social' }));
    expect(screen.queryByText('Quote card numbers')).toBeNull();
  });

  it('starts a thread in a channel with its plus button', () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'New thread in social' }));
    expect(props.onNewInChannel).toHaveBeenCalledWith('social');
  });

  it('moves a thread to another channel from its menu', () => {
    const props = renderSidebar();
    openChannel('general');
    const row = screen.getByText('Plain old chat').closest('div.group');
    fireEvent.click(within(row).getByRole('button', { name: 'Chat options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to…' }));
    fireEvent.click(screen.getByRole('button', { name: '# AI & Leadership' }));
    expect(props.onMoveThread).toHaveBeenCalledWith('t2', 'ai-and-leadership');
  });

  it('offers a new project channel', () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'New project channel' }));
    expect(props.onNewChannel).toHaveBeenCalled();
  });

  it('never loses a thread whose channel is not listed', () => {
    renderSidebar();
    openChannel('general');
    // "Old chat with Jot" belongs to #team, which this list does not have.
    expect(screen.getByText('Old chat with Jot')).toBeInTheDocument();
  });

  it('falls back to the plain list while channels load', () => {
    renderSidebar({ channels: null });
    expect(screen.queryByText('# social')).toBeNull();
    expect(screen.getByText('Quote card numbers')).toBeInTheDocument();
  });
});
