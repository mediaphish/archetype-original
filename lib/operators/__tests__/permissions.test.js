/**
 * Unit tests for Operators permission helpers
 * Plan 3.1: "permissions.test.js"
 */

jest.mock('../../supabase-admin.js', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
        })),
      })),
    })),
  },
}));

import { getUserOperatorsRoles, hasRole, hasAnyRole, canPerformAction } from '../permissions.js';
import { supabaseAdmin } from '../../supabase-admin.js';

describe('Operators permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserOperatorsRoles', () => {
    it('returns empty array when email is missing', async () => {
      const roles = await getUserOperatorsRoles('');
      expect(roles).toEqual([]);
    });

    it('returns roles from operators_users', async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { roles: ['operator', 'chief_operator'] },
        error: null,
      });
      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });
      const roles = await getUserOperatorsRoles('user@example.com');
      expect(roles).toEqual(['operator', 'chief_operator']);
    });

    it('returns empty array when user not found', async () => {
      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      const roles = await getUserOperatorsRoles('nobody@example.com');
      expect(roles).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the role', async () => {
      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { roles: ['chief_operator'] },
              error: null,
            }),
          }),
        }),
      });
      const result = await hasRole('co@example.com', 'chief_operator');
      expect(result).toBe(true);
    });

    it('returns false when user does not have the role', async () => {
      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { roles: ['operator'] },
              error: null,
            }),
          }),
        }),
      });
      const result = await hasRole('op@example.com', 'chief_operator');
      expect(result).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('super_admin can do any action in LIVE', async () => {
      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { roles: ['super_admin'] },
              error: null,
            }),
          }),
        }),
      });
      const result = await canPerformAction('sa@example.com', 'LIVE', 'open_event');
      expect(result).toBe(true);
    });

    it('operator cannot open_event in LIVE', async () => {
      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { roles: ['operator'] },
              error: null,
            }),
          }),
        }),
      });
      const result = await canPerformAction('op@example.com', 'LIVE', 'open_event');
      expect(result).toBe(false);
    });
  });
});
