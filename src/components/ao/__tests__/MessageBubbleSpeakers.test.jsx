import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../AutoV2Panel';
import { splitBySpeaker } from '../../../lib/speakerSplit';

/**
 * Bart, 2026-10-26, on a reply where Vox spoke and then it went back to Ada:
 * "those need to be treated like individual chat bubbles for each. Just like a
 * real chat would."
 */
describe('splitBySpeaker', () => {
  it('splits a reply at each teammate who speaks', () => {
    const text = 'Here is the outline.\n\n**Vox:** Wednesday is the slot.\nNov 4 is open.\n\n**Ada:** If the brief works, Jot drafts it.';
    expect(splitBySpeaker(text, 'auto')).toEqual([
      { agent: 'auto', text: 'Here is the outline.' },
      { agent: 'reach', text: 'Wednesday is the slot.\nNov 4 is open.' },
      { agent: 'auto', text: 'If the brief works, Jot drafts it.' },
    ]);
  });
  it('a reply in one voice stays one bubble, and its name label is dropped', () => {
    expect(splitBySpeaker('Cam: Who are we recording next?', 'producer')).toEqual([{ agent: 'producer', text: 'Who are we recording next?' }]);
    expect(splitBySpeaker('Just an answer.', 'auto')).toEqual([{ agent: 'auto', text: 'Just an answer.' }]);
  });
  it('the old names still split, and a name mid-sentence does not', () => {
    expect(splitBySpeaker('A.\nReach: B.', 'auto').map((p) => p.agent)).toEqual(['auto', 'reach']);
    expect(splitBySpeaker('Ask Vox: she knows.', 'auto')).toHaveLength(1);
  });
});

describe('MessageBubble', () => {
  it('shows each teammate as their own bubble with their name', () => {
    render(
      <MessageBubble
        message={{ role: 'assistant', content: 'Outline first.\n\n**Vox:** Wednesday is the slot.\n\n**Ada:** Want changes?', meta: { agent: 'auto' } }}
      />
    );
    expect(screen.getByText('Outline first.')).toBeInTheDocument();
    expect(screen.getByText('Wednesday is the slot.')).toBeInTheDocument();
    expect(screen.getByText('Want changes?')).toBeInTheDocument();
    expect(screen.getAllByAltText('Vox')).toHaveLength(1);
    expect(screen.getAllByAltText('Ada')).toHaveLength(2);
  });
  it('a one-voice reply is one bubble', () => {
    render(<MessageBubble message={{ role: 'assistant', content: 'Vox: The week is full.', meta: { agent: 'reach' } }} />);
    expect(screen.getByText('The week is full.')).toBeInTheDocument();
    expect(screen.getAllByAltText('Vox')).toHaveLength(1);
  });
});
