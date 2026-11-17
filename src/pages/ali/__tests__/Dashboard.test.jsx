/**
 * Render tests for the ALI results screen (mocked results payloads).
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';

jest.mock('../../../components/ali/AliArchyDrawer', () => function MockDrawer() {
  return null;
});
jest.mock('../../../components/OptimizedImage', () => ({
  OptimizedImage: () => null,
}));

const conditions = [
  { key: 'clarity', label: 'Clarity', team: 82, leader: 85 },
  { key: 'consistency', label: 'Consistency', team: 70, leader: 72 },
  { key: 'accountability', label: 'Accountability', team: 60, leader: 65 },
  { key: 'voice', label: 'Voice', team: 48, leader: 78 },
  { key: 'growth', label: 'Growth', team: 66, leader: 70 },
  { key: 'support', label: 'Support', team: 74, leader: 70 },
  { key: 'alignment', label: 'Alignment', team: 68, leader: 69 },
];

const readyPayload = {
  ok: true,
  round: { number: 2, status: 'closed', opensAt: '2026-11-01', closesAt: '2026-11-30' },
  rounds: [
    { number: 2, status: 'closed' },
    { number: 1, status: 'closed' },
  ],
  ready: true,
  teamResponses: 9,
  needed: 5,
  leaderAnswered: true,
  confidence: { key: 'solid', label: 'Solid read', teamResponses: 9 },
  conditions,
  results: [
    { key: 'trust', label: 'Trust', team: 64, leader: 80 },
    { key: 'commitment', label: 'Commitment', team: 71, leader: 75 },
  ],
  mirror: null,
  drift: [
    { key: 'clarity', label: 'Clarity', previous: 76, current: 82, change: 6 },
    { key: 'voice', label: 'Voice', previous: 52, current: 48, change: -4 },
  ],
  patterns: [{ key: 'filtered_picture', title: 'A filtered picture', text: 'x' }],
};

const waitingPayload = {
  ok: true,
  round: { number: 1, status: 'open', opensAt: '2026-11-17', closesAt: '2026-12-04' },
  rounds: [{ number: 1, status: 'open' }],
  ready: false,
  reason: 'not_enough_responses',
  teamResponses: 3,
  needed: 5,
  leaderAnswered: false,
  leaderOwn: { answered: false },
};

function mockFetch(body, status = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
  );
}

afterEach(() => {
  delete global.fetch;
});

describe('ALI results screen', () => {
  it('shows the ready state: status, headline, mirror, focus, bars, change', async () => {
    mockFetch(readyPayload);
    render(<Dashboard />);
    expect(await screen.findByText(/Round 2 closed Nov 30 · 9 team members answered/)).toBeInTheDocument();
    expect(screen.getByText('Solid read')).toBeInTheDocument();
    expect(
      screen.getByText('Your team sees Clarity as your strongest condition. You rate Voice 30 points higher than they do.')
    ).toBeInTheDocument();
    expect(screen.getByText('Team 48 · You 78')).toBeInTheDocument();
    expect(screen.getByText('What it produces')).toBeInTheDocument();
    expect(screen.getAllByText(/You rate this higher than your team/).length).toBeGreaterThan(0);
    // Focus is the lowest team score: Voice.
    expect(screen.getByText('Ask Archy about Voice')).toBeInTheDocument();
    expect(screen.getByText('Read more on Voice').getAttribute('href')).toBe(
      '/journal/ali-series-communication-the-message-that-actually-arrives'
    );
    expect(screen.getByText('You may be working from a filtered picture')).toBeInTheDocument();
    expect(screen.getByText('up 6 since last round')).toBeInTheDocument();
    expect(screen.getByText('down 4 since last round')).toBeInTheDocument();
    expect(screen.getByLabelText('Show round')).toBeInTheDocument();
    expect(screen.getByText('How this works')).toBeInTheDocument();
    // Old dashboard pieces are gone.
    expect(screen.queryByText(/zone/i)).toBeNull();
    expect(screen.queryByText(/Leadership Profile/i)).toBeNull();
  });

  it('never shows the leader dot or gap words when the leader did not answer', async () => {
    mockFetch({
      ...readyPayload,
      leaderAnswered: false,
      conditions: conditions.map((c) => ({ ...c, leader: null })),
      results: readyPayload.results.map((c) => ({ ...c, leader: null })),
      drift: null,
      patterns: [],
    });
    render(<Dashboard />);
    expect(await screen.findByText(/only your team's view is shown/)).toBeInTheDocument();
    expect(screen.queryByText(/You rate this higher/)).toBeNull();
    expect(screen.queryByText(/· You \d+/)).toBeNull();
    expect(screen.queryByText(/since last round/)).toBeNull();
  });

  it('shows the waiting state with what is needed and the leader link prompt', async () => {
    mockFetch(waitingPayload);
    render(<Dashboard />);
    expect(
      await screen.findByText('Results appear when the round closes and at least 5 team members have answered.')
    ).toBeInTheDocument();
    expect(screen.getByText('So far 3 of the 5 needed have answered.')).toBeInTheDocument();
    expect(screen.getByText('Get your leader link')).toBeInTheDocument();
    expect(screen.queryByText(/strongest condition/)).toBeNull();
    expect(screen.queryByLabelText('Show round')).toBeNull();
  });

  it("shows the leader's own answers while waiting", async () => {
    mockFetch({
      ...waitingPayload,
      reason: 'round_open',
      teamResponses: 6,
      leaderAnswered: true,
      leaderOwn: {
        answered: true,
        conditions: conditions.map((c) => ({ key: c.key, label: c.label, score: c.leader })),
        results: [],
      },
    });
    render(<Dashboard />);
    expect(await screen.findByText('Your own answers')).toBeInTheDocument();
    expect(screen.getByText('You have taken your own survey for this round.')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
  });

  it('shows the welcome state when there are no rounds', async () => {
    mockFetch({ ok: true, round: null, rounds: [], ready: false, reason: 'no_rounds', teamResponses: 0, needed: 5 });
    render(<Dashboard />);
    expect(await screen.findByText('Welcome to ALI')).toBeInTheDocument();
    expect(screen.getByText('Send your first survey')).toBeInTheDocument();
  });

  it('shows a plain error with a retry, never sample numbers', async () => {
    mockFetch({ ok: false, error: 'boom' }, 500);
    render(<Dashboard />);
    expect(await screen.findByText('Try again')).toBeInTheDocument();
    expect(screen.queryByText(/Team \d+/)).toBeNull();
    mockFetch(readyPayload);
    fireEvent.click(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText('Solid read')).toBeInTheDocument());
  });
});
