/**
 * Anthropic Messages API helper with truncation detection and auto-continue.
 *
 * When stop_reason === 'max_tokens', fires follow-up calls until end_turn
 * or a runaway-prevention cap is hit. Never returns a silent partial result.
 */

/** Claude Sonnet 4.6 synchronous Messages API max output (tokens). */
export const ANTHROPIC_MAX_OUTPUT_TOKENS = 64000;

export const MAX_CONTINUATION_LOOPS = 5;

const CONTINUE_USER_MESSAGE =
  'Continue exactly where you left off. Do not repeat any content already written. Do not re-introduce or add preamble. Pick up mid-sentence if the previous part ended mid-thought and complete the full response.';

function parseMaxOutputTokens() {
  const raw = Number(process.env.AUTO_MAX_OUTPUT_TOKENS);
  if (Number.isFinite(raw) && raw >= 1024) {
    return Math.min(raw, ANTHROPIC_MAX_OUTPUT_TOKENS);
  }
  return ANTHROPIC_MAX_OUTPUT_TOKENS;
}

function extractTextFromContent(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function isCompleteStopReason(stopReason) {
  return stopReason === 'end_turn' || stopReason === 'stop_sequence';
}

/**
 * Call client.messages.create with auto-continue on max_tokens truncation.
 * When stop_reason is tool_use and options.toolContext is set, runs the client
 * tool loop (JARVIS Phase 1 custom tools) before returning.
 *
 * @returns {Promise<{ ok: true, text: string, usage: object, stop_reason: string, continuation_count: number, saveDraftSucceeded?: boolean, toolsUsed?: string[] } | { ok: false, error: string, message?: string, partial_text?: string }>}
 */
export async function createCompleteMessage(client, params, options = {}) {
  const maxContinuations = options.maxContinuations ?? MAX_CONTINUATION_LOOPS;
  const maxTokens = options.maxTokens ?? parseMaxOutputTokens();
  const continueMessage = options.continueMessage ?? CONTINUE_USER_MESSAGE;
  const toolContext = options.toolContext || null;

  let messages = Array.isArray(params.messages) ? [...params.messages] : [];
  let stitchedText = '';
  let totalUsage = { input_tokens: 0, output_tokens: 0 };
  let loops = 0;
  let lastStopReason = null;
  let lastResponse = null;
  let saveDraftSucceeded = false;
  let toolsUsed = [];

  while (loops <= maxContinuations) {
    const stream = client.messages.stream({
      ...params,
      messages,
      max_tokens: maxTokens,
    });

    lastResponse = await stream.finalMessage();

    lastStopReason = lastResponse.stop_reason;
    totalUsage.input_tokens += lastResponse.usage?.input_tokens || 0;
    totalUsage.output_tokens += lastResponse.usage?.output_tokens || 0;

    const chunkText = extractTextFromContent(lastResponse.content);
    if (chunkText) {
      stitchedText += chunkText;
    }

    if (isCompleteStopReason(lastStopReason)) {
      const { serverToolNamesFromContent } = await import('./runClientToolLoop.js');
      toolsUsed = [...new Set([...toolsUsed, ...serverToolNamesFromContent(lastResponse?.content)])];
      return {
        ok: true,
        text: stitchedText,
        usage: totalUsage,
        stop_reason: lastStopReason,
        continuation_count: loops,
        saveDraftSucceeded,
        toolsUsed,
      };
    }

    // JARVIS client tools — execute and continue in-turn.
    if (lastStopReason === 'tool_use' && toolContext) {
      const { continueAfterClientToolUse, serverToolNamesFromContent } = await import(
        './runClientToolLoop.js'
      );
      const looped = await continueAfterClientToolUse({
        client,
        model: params.model,
        system: params.system,
        messages,
        tools: params.tools,
        maxTokens,
        finalMessage: lastResponse,
        toolContext,
      });
      stitchedText = looped.stitchedText || stitchedText;
      saveDraftSucceeded = looped.saveDraftSucceeded;
      toolsUsed = [
        ...new Set([
          ...toolsUsed,
          ...(looped.toolsUsed || []),
          ...serverToolNamesFromContent(lastResponse?.content),
          ...serverToolNamesFromContent(looped.finalMessage?.content),
        ]),
      ];
      const toolResults = looped.toolResults || [];
      lastStopReason = looped.finalMessage?.stop_reason || lastStopReason;
      lastResponse = looped.finalMessage;
      totalUsage.output_tokens += looped.finalMessage?.usage?.output_tokens || 0;
      return {
        ok: true,
        text: stitchedText,
        usage: totalUsage,
        stop_reason: lastStopReason,
        continuation_count: loops,
        saveDraftSucceeded,
        toolsUsed,
        toolResults,
      };
    }

    if (lastStopReason !== 'max_tokens') {
      if (stitchedText.trim()) {
        console.warn(
          '[anthropicCompleteMessage] unexpected stop_reason with text:',
          lastStopReason
        );
        return {
          ok: true,
          text: stitchedText,
          usage: totalUsage,
          stop_reason: lastStopReason,
          continuation_count: loops,
          saveDraftSucceeded,
          toolsUsed,
        };
      }
      return {
        ok: false,
        error: 'unexpected_stop_reason',
        message: `Auto stopped unexpectedly (${lastStopReason || 'unknown'}). Try again or shorten the request.`,
      };
    }

    loops += 1;
    if (loops > maxContinuations) {
      console.error(
        '[anthropicCompleteMessage] hit continuation cap without completion',
        { loops, output_tokens: totalUsage.output_tokens }
      );
      return {
        ok: false,
        error: 'incomplete_response',
        partial_text: stitchedText,
        message:
          'Auto could not finish this response within the safety limit. The content is incomplete and was not delivered. A technical check is needed before retrying.',
      };
    }

    messages = [
      ...messages,
      { role: 'assistant', content: lastResponse.content },
      { role: 'user', content: continueMessage },
    ];
  }

  return {
    ok: false,
    error: 'incomplete_response',
    partial_text: stitchedText,
    message:
      'Auto could not finish this response within the safety limit. The content is incomplete and was not delivered. A technical check is needed before retrying.',
  };
}
