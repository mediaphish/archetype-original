/**
 * Bart, 2026-10-27: the team row ran the roles together ("MarketingWriter"),
 * and "I think there are going to be more agents." Shown the Slack way: a
 * stack of faces with a count, and a tap opens names and roles.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamFacepile } from '../AutoV2Panel.jsx';

const team = (n) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, handle: `Mate${i}`, role: `Role ${i}` }));

test('shows the faces and the count, roles only once opened', () => {
  render(<TeamFacepile />);
  expect(screen.getByTestId('team-facepile')).toHaveTextContent('7 teammates');
  expect(screen.queryByTestId('team-list')).toBeNull();
  fireEvent.click(screen.getByTestId('team-facepile'));
  const list = screen.getByTestId('team-list');
  expect(list).toHaveTextContent('Ada');
  expect(list).toHaveTextContent('Marketing Director');
  expect(list).toHaveTextContent('Red');
  expect(list).toHaveTextContent('Des');
});

test('more teammates fit: five faces, then a +count', () => {
  render(<TeamFacepile members={team(8)} />);
  expect(screen.getByTestId('team-facepile')).toHaveTextContent('+3');
  expect(screen.getByTestId('team-facepile')).toHaveTextContent('8 teammates');
  fireEvent.click(screen.getByTestId('team-facepile'));
  expect(screen.getByTestId('team-list').querySelectorAll('li')).toHaveLength(8);
});
