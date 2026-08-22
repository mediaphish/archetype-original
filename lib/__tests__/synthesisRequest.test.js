/**
 * @jest-environment node
 *
 * The corpus-synthesis pass re-calls the model after documents are fetched. It
 * was doing so with no tools, so Auto answered that turn as a toolless model —
 * which is to say, by explaining it could not save drafts, schedule or publish.
 * Bart typed "Go" and received an identity disclaimer.
 */
import {
  buildSynthesisRequest,
  looksLikeCapabilityDisclaimer,
} from '../ao/synthesisRequest.js';

const base = {
  model: 'claude-sonnet-5',
  system: 'You are Auto.',
  messages: [{ role: 'user', content: 'Go' }],
};

describe('buildSynthesisRequest', () => {
  it('carries the tools from the first pass', () => {
    const tools = [{ name: 'save_draft' }, { name: 'publish_journal' }];
    expect(buildSynthesisRequest({ ...base, tools }).tools).toEqual(tools);
  });

  it('omits tools only when there are genuinely none', () => {
    expect(buildSynthesisRequest({ ...base, tools: [] })).not.toHaveProperty('tools');
    expect(buildSynthesisRequest(base)).not.toHaveProperty('tools');
  });

  it('ignores a non-array tools value rather than sending garbage', () => {
    expect(buildSynthesisRequest({ ...base, tools: 'save_draft' })).not.toHaveProperty('tools');
  });

  it('passes model, system and messages through', () => {
    const req = buildSynthesisRequest(base);
    expect(req.model).toBe('claude-sonnet-5');
    expect(req.system).toBe('You are Auto.');
    expect(req.messages).toHaveLength(1);
    expect(req.max_tokens).toBe(8000);
  });

  it('refuses to build a request missing its essentials', () => {
    expect(() => buildSynthesisRequest({ ...base, model: '' })).toThrow(/model/);
    expect(() => buildSynthesisRequest({ ...base, system: '' })).toThrow(/system/);
    expect(() => buildSynthesisRequest({ ...base, messages: [] })).toThrow(/messages/);
  });
});

describe('looksLikeCapabilityDisclaimer', () => {
  it('recognises the reply Bart actually received', () => {
    const real =
      "I appreciate the detailed status update, but I need to clarify my role here. " +
      "I'm Claude, an AI assistant, so I can't actually:\n- Approve or save content to drafts\n" +
      '- Schedule or publish to any platforms';
    expect(looksLikeCapabilityDisclaimer(real)).toBe(true);
  });

  it('recognises the hand-off phrasing', () => {
    expect(
      looksLikeCapabilityDisclaimer(
        "you'll need to connect with whoever on your team has access to those systems"
      )
    ).toBe(true);
  });

  it('does not fire on ordinary Auto replies', () => {
    expect(
      looksLikeCapabilityDisclaimer(
        'New header generated and saved to the draft. Take a look and tell me if she reads right.'
      )
    ).toBe(false);
    expect(looksLikeCapabilityDisclaimer('Scheduled for Wednesday at 6am.')).toBe(false);
  });

  it('does not fire on a genuine refusal that keeps its identity', () => {
    // A real "I won't do that" must still reach Bart unedited; this only detects
    // the model disowning what Auto is.
    expect(
      looksLikeCapabilityDisclaimer(
        "I'm not publishing that until the quote verifies against the corpus."
      )
    ).toBe(false);
  });

  it('handles empty input', () => {
    expect(looksLikeCapabilityDisclaimer('')).toBe(false);
    expect(looksLikeCapabilityDisclaimer(null)).toBe(false);
  });
});
