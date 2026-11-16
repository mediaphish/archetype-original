import { render, screen } from '@testing-library/react';
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
});
