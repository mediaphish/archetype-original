import { metricsAlertKeyFor } from '../metricsAlertKey';

describe('metricsAlertKeyFor', () => {
  it('returns null when there is nothing to show', () => {
    expect(metricsAlertKeyFor([])).toBeNull();
    expect(metricsAlertKeyFor(null)).toBeNull();
    expect(metricsAlertKeyFor(undefined)).toBeNull();
    expect(metricsAlertKeyFor(['', '   '])).toBeNull();
  });

  it('is stable regardless of order', () => {
    // The server gives no ordering guarantee. A reshuffle must not resurrect a
    // banner the owner already dismissed.
    const a = metricsAlertKeyFor(['LinkedIn: no permission', 'Facebook: missing permissions']);
    const b = metricsAlertKeyFor(['Facebook: missing permissions', 'LinkedIn: no permission']);
    expect(a).toBe(b);
  });

  it('changes when a new failure appears', () => {
    // This is the property that makes dismissal safe: today's LinkedIn failure
    // can be dismissed for as long as it stays exactly today's failure, and a
    // second channel breaking still gets through.
    const before = metricsAlertKeyFor(['LinkedIn: no permission']);
    const after = metricsAlertKeyFor(['LinkedIn: no permission', 'Twitter: token expired']);
    expect(after).not.toBe(before);
  });

  it('changes when a failure clears', () => {
    const both = metricsAlertKeyFor(['LinkedIn: no permission', 'Twitter: token expired']);
    const one = metricsAlertKeyFor(['LinkedIn: no permission']);
    expect(one).not.toBe(both);
  });

  it('changes when the same channel fails differently', () => {
    const a = metricsAlertKeyFor(['LinkedIn: no permission']);
    const b = metricsAlertKeyFor(['LinkedIn: token expired']);
    expect(a).not.toBe(b);
  });

  it('ignores surrounding whitespace so trivial formatting does not resurrect the banner', () => {
    expect(metricsAlertKeyFor(['  LinkedIn: no permission  '])).toBe(
      metricsAlertKeyFor(['LinkedIn: no permission'])
    );
  });
});
