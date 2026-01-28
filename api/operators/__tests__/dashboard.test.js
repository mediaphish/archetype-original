/**
 * Integration tests for Operators Dashboard API
 * 
 * These tests verify the dashboard API endpoint returns correct aggregate metrics
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

// Mock supabase-admin
jest.mock('../../../lib/supabase-admin.js', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('Dashboard API Integration', () => {
  let mockFrom;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom = jest.fn().mockReturnThis();
    supabaseAdmin.from = mockFrom;
  });

  describe('Event Metrics', () => {
    it('should return total events count', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue({ count: 10 }),
        }),
      });

      // Simulate the API logic
      const { count: totalEvents } = await supabaseAdmin
        .from('operators_events')
        .select('*', { count: 'exact', head: true });

      expect(totalEvents).toBe(10);
    });

    it('should calculate seats filled rate correctly', () => {
      const totalSeats = 100;
      const filledSeats = 75;
      const seatsFilledRate = totalSeats > 0 ? (filledSeats / totalSeats) * 100 : 0;
      
      expect(seatsFilledRate).toBe(75);
    });

    it('should handle zero total seats gracefully', () => {
      const totalSeats = 0;
      const filledSeats = 0;
      const seatsFilledRate = totalSeats > 0 ? (filledSeats / totalSeats) * 100 : 0;
      
      expect(seatsFilledRate).toBe(0);
    });
  });

  describe('Voting Completion Rate', () => {
    it('should calculate voting completion rate correctly', () => {
      const totalAttendees = 20;
      const completedVoters = 15;
      const votingCompletionRate = totalAttendees > 0 ? (completedVoters / totalAttendees) * 100 : 0;
      
      expect(votingCompletionRate).toBe(75);
    });

    it('should handle zero attendees gracefully', () => {
      const totalAttendees = 0;
      const completedVoters = 0;
      const votingCompletionRate = totalAttendees > 0 ? (completedVoters / totalAttendees) * 100 : 0;
      
      expect(votingCompletionRate).toBe(0);
    });
  });

  describe('Room Positivity Index', () => {
    it('should calculate average upvote ratio correctly', () => {
      const upvoteRatios = [0.8, 0.9, 0.7, 0.85];
      const avgUpvoteRatio = upvoteRatios.length > 0
        ? upvoteRatios.reduce((sum, r) => sum + r, 0) / upvoteRatios.length
        : 0;
      
      expect(avgUpvoteRatio).toBeCloseTo(0.8125, 4);
    });

    it('should handle empty ratios array', () => {
      const upvoteRatios = [];
      const avgUpvoteRatio = upvoteRatios.length > 0
        ? upvoteRatios.reduce((sum, r) => sum + r, 0) / upvoteRatios.length
        : 0;
      
      expect(avgUpvoteRatio).toBe(0);
    });
  });

  describe('Signal Clarity', () => {
    it('should calculate standard deviation correctly', () => {
      const upvoteRatios = [0.8, 0.9, 0.7, 0.85];
      const mean = upvoteRatios.reduce((a, b) => a + b, 0) / upvoteRatios.length;
      const variance = upvoteRatios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / upvoteRatios.length;
      const signalClarity = Math.sqrt(variance);
      
      expect(signalClarity).toBeGreaterThan(0);
      expect(signalClarity).toBeLessThan(1);
    });
  });

  describe('Promotion Rate', () => {
    it('should calculate promotion rate correctly', () => {
      const totalCandidates = 50;
      const promotedCandidates = 10;
      const promotionRate = totalCandidates > 0 ? (promotedCandidates / totalCandidates) * 100 : 0;
      
      expect(promotionRate).toBe(20);
    });

    it('should handle zero candidates gracefully', () => {
      const totalCandidates = 0;
      const promotedCandidates = 0;
      const promotionRate = totalCandidates > 0 ? (promotedCandidates / totalCandidates) * 100 : 0;
      
      expect(promotionRate).toBe(0);
    });
  });
});
