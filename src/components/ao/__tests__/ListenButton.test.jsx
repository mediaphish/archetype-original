import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ListenButton, { isLongForm } from '../ListenButton.jsx';

describe('Listen button', () => {
  test('shows on long-form work only', () => {
    expect(isLongForm('word '.repeat(299))).toBe(false);
    expect(isLongForm('word '.repeat(300))).toBe(true);
  });
  test('renders for a long piece', () => {
    render(<ListenButton text={'word '.repeat(400)} title="The Abigail Archetype" />);
    expect(screen.getByTestId('listen-button')).toHaveTextContent('Listen');
  });
  test('stays out of the way on short pieces', () => {
    const { container } = render(<ListenButton text="A short caption." />);
    expect(container.firstChild).toBeNull();
  });

  test('first tap only checks; nothing is made until he confirms', async () => {
    const bodies = [];
    global.fetch = jest.fn(async (_u, opts) => {
      const b = JSON.parse(opts.body);
      bodies.push(b);
      return { ok: true, json: async () => (b.check ? { ok: true, cached: false, minutes: 28, dollars: 0.42 } : { ok: true, url: 'https://x/a.mp3' }) };
    });
    render(<ListenButton text={'word '.repeat(400)} title="T" />);
    fireEvent.click(screen.getByTestId('listen-button'));
    await waitFor(() => expect(screen.getByTestId('listen-confirm')).toHaveTextContent('about 42 cents'));
    expect(bodies).toEqual([expect.objectContaining({ check: true })]);
    fireEvent.click(screen.getByTestId('listen-cancel'));
    expect(bodies.length).toBe(1);
    fireEvent.click(screen.getByTestId('listen-button'));
    await waitFor(() => screen.getByTestId('listen-make'));
    fireEvent.click(screen.getByTestId('listen-make'));
    await waitFor(() => screen.getByTestId('listen-player'));
    expect(bodies[2]).toEqual(expect.objectContaining({ confirm: true }));
  });
  test('audio already made plays without asking', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, cached: true, url: 'https://x/a.mp3' }) }));
    render(<ListenButton text={'word '.repeat(400)} title="T" />);
    fireEvent.click(screen.getByTestId('listen-button'));
    await waitFor(() => screen.getByTestId('listen-player'));
  });
});
