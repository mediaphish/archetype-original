/**
 * Super Admin Overview API tests
 *
 * Ensures the overview handler returns 200, ok: true, and overview structure.
 * Regression test for leadershipMirror/experienceMap undefined throw.
 *
 * @jest-environment node
 */

import overviewHandler from '../overview.js';

jest.mock('../../../../lib/supabase-admin.js', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';

const thenable = (data, error = null) => ({ then: (resolve) => resolve({ data, error }) });

function mockChain(result) {
  const t = thenable(result?.data ?? [], result?.error ?? null);
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnValue(t),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnValue(t),
  };
}

describe('Super Admin Overview API', () => {
  let req; let res; let statusSpy; let jsonSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    statusSpy = jest.fn().mockReturnThis();
    jsonSpy = jest.fn();
    req = { method: 'GET' };
    res = { status: statusSpy, json: jsonSpy };

    const qb = { data: [{ stable_id: 'Q1', pattern: 'clarity', is_negative: false, is_anchor: false, role: 'team_member' }], error: null };
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'ali_question_bank') return mockChain(qb);
      if (table === 'ali_companies') return mockChain({ data: [], error: null });
      if (table === 'ali_survey_deployments') return mockChain({ data: [], error: null });
      if (table === 'ali_contacts') return mockChain({ data: [], error: null });
      if (table === 'ali_survey_responses') return mockChain({ data: [], error: null });
      return mockChain({ data: [], error: null });
    });
  });

  it('returns 200 and overview with metrics, leadershipMirror, experienceMap, segmentation, contentMining, productMetrics, benchmarks, platformALITrend', async () => {
    await overviewHandler(req, res);
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledTimes(1);
    const body = jsonSpy.mock.calls[0][0];
    expect(body.ok).toBe(true);
    expect(body.overview).toBeDefined();
    expect(body.overview.metrics).toBeDefined();
    expect(body.overview.metrics.companies).toBeDefined();
    expect(body.overview.metrics.respondents).toBeDefined();
    expect(body.overview.metrics.surveys).toBeDefined();
    expect(body.overview.leadershipMirror).toBeDefined();
    expect(body.overview.leadershipMirror.gaps).toBeDefined();
    expect(body.overview.leadershipMirror.severity).toBeDefined();
    expect(body.overview.leadershipMirror.leaderScores).toBeDefined();
    expect(body.overview.leadershipMirror.teamScores).toBeDefined();
    expect(body.overview.experienceMap === null || typeof body.overview.experienceMap === 'object').toBe(true);
    expect(body.overview.segmentation).toBeDefined();
    expect(Array.isArray(body.overview.segmentation.byIndustry)).toBe(true);
    expect(Array.isArray(body.overview.segmentation.byCompanySize)).toBe(true);
    expect(body.overview.contentMining).toBeDefined();
    expect(body.overview.productMetrics).toBeDefined();
    expect(body.overview.benchmarks).toBeDefined();
    expect(Array.isArray(body.overview.platformALITrend)).toBe(true);
    expect(body.overview.engagementDetail).toBeDefined();
  });

  it('returns 405 for non-GET', async () => {
    req.method = 'POST';
    await overviewHandler(req, res);
    expect(statusSpy).toHaveBeenCalledWith(405);
    expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ error: 'Method not allowed' }));
  });
});
