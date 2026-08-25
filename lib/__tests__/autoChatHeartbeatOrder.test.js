/**
 * @jest-environment node
 *
 * The "Auto didn't respond in time" bug was an ordering bug, and ordering is
 * what this locks.
 *
 * api/ao/auto/chat.js used to start its 15 second heartbeat only after model
 * token streaming finished. During the model turn the only event ever emitted is
 * `token`, one per text delta, so the connection was completely silent through
 * extended thinking, through every tool call, and through the gaps between round
 * trips in a multi-tool loop. The client aborts after 90 seconds of silence, so
 * any one of those killed a request the server would have completed.
 *
 * Production, 2026-08-25: nothing logged between 19:40:59 and the user's retry
 * at 19:43:45. The server was working the whole time.
 *
 * Asserted against the source text rather than by mocking a 2,800 line handler.
 * A mock-based test here would mostly assert that the mocks were wired the way
 * the test wired them; the real invariant is that one statement precedes
 * another, and that is exactly what is checked.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(process.cwd(), 'api/ao/auto/chat.js'), 'utf8');

describe('chat.js heartbeat', () => {
  it('starts the heartbeat before the model call, not after it', () => {
    const heartbeatStart = SRC.indexOf('heartbeatTimer = setInterval(');
    const modelCall = SRC.indexOf('runAutoChatStream(');

    expect(heartbeatStart).toBeGreaterThan(-1);
    expect(modelCall).toBeGreaterThan(-1);
    expect(heartbeatStart).toBeLessThan(modelCall);
  });

  it('starts the heartbeat exactly once', () => {
    // It was started in a second place after streaming ended. Two setIntervals
    // assigned to the same variable leaks the first one, which then holds the
    // serverless function open to maxDuration.
    const starts = SRC.match(/heartbeatTimer = setInterval\(/g) || [];
    expect(starts).toHaveLength(1);
  });

  it('keeps the interval at or below a third of the client stall window', () => {
    // Client aborts after 90s of silence. A heartbeat slower than 30s would give
    // no margin for a single delayed tick.
    const m = SRC.match(/heartbeatTimer = setInterval\([\s\S]{0,200}?\},\s*(\d+)\);/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeLessThanOrEqual(30000);
  });

  it('routes error exits through the helper that clears the heartbeat', () => {
    // Five early returns sat between the heartbeat start and the cleanup sites.
    // Each one left the interval running. They go through endWithError now.
    expect(SRC).toMatch(/const endWithError = \(error\) => \{/);
    expect(SRC).toMatch(/clearInterval\(heartbeatTimer\)/);
  });

  it('has exactly four places that end the response', () => {
    // Counted deliberately, because a new res.end() is how this regresses. The
    // four that are correct:
    //
    //   1. inside endWithError, which clears the heartbeat first
    //   2. the "message required" guard, which runs before the heartbeat starts
    //   3. the success path, which clears immediately before sending `done`
    //   4. the outer catch, which clears before sending `error`
    //
    // Anything else must either use endWithError or clear the timer itself.
    // If this count changes, check the new exit rather than bumping the number.
    const ends = SRC.match(/res\.end\(\);/g) || [];
    expect(ends).toHaveLength(4);
  });

  it('stops post-stream work when the client has gone away', () => {
    // An aborted request used to keep running to its own 270s budget and keep
    // writing to the database, so a retry raced the abandoned run.
    expect(SRC).toMatch(/req\.on\('close'/);
    expect(SRC).toMatch(/if \(clientGone\)/);

    const closeListener = SRC.indexOf("req.on('close'");
    const guard = SRC.indexOf('if (clientGone) {');
    expect(closeListener).toBeLessThan(guard);
  });

  it('makes sendEvent a no-op once the client is gone', () => {
    const sendEvent = SRC.indexOf('const sendEvent = (event, data) => {');
    const guard = SRC.indexOf('if (clientGone) return;');
    expect(sendEvent).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(sendEvent);
  });
});

describe('runClientToolLoop timing', () => {
  const LOOP = fs.readFileSync(path.join(process.cwd(), 'lib/ao/runClientToolLoop.js'), 'utf8');

  it('logs elapsed time for every tool call', () => {
    // Without this there is no way to tell which call is slow, or whether
    // anything is running at all, which is why diagnosing this took a
    // screenshot and a log pull.
    expect(LOOP).toMatch(/\[Auto V2 tool\]/);
    expect(LOOP).toMatch(/const toolStartedAt = Date\.now\(\)/);
  });

  it('logs even when the tool throws', () => {
    // A tool that throws is the most interesting one to have timed.
    expect(LOOP).toMatch(/\} finally \{[\s\S]{0,400}?\[Auto V2 tool\]/);
  });
});
