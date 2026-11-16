import { render, screen, fireEvent } from '@testing-library/react';
import { BriefTab } from '../StagedJournalPanel.jsx';

describe('Research & Brief tab (2026-11-16)', () => {
  test('shows the outline first, and the brief one tap away', () => {
    render(<BriefTab brief={{ outline_text: 'THE OUTLINE text', outline_approved_at: 'x', brief_text: 'THE BRIEF text', brief_approved_at: 'y' }} />);
    expect(screen.getByTestId('brief-tab')).toHaveTextContent('THE OUTLINE text');
    fireEvent.click(screen.getByText('Brief (approved)'));
    expect(screen.getByTestId('brief-tab')).toHaveTextContent('THE BRIEF text');
  });
  test('says so plainly when nothing is saved', () => {
    render(<BriefTab brief={{}} />);
    expect(screen.getByText(/No brief or outline is saved/)).toBeInTheDocument();
  });
});
