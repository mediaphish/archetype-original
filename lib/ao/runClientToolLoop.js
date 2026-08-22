/**
 * Mid-turn client tool loop for Auto custom tools (JARVIS Phase 1).
 * Leaves Anthropic server tools (web_search) alone — those resolve inside the API.
 */
import { executeAutoTool } from './autoToolHandlers.js';

function extractTextFromContent(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('');
}

function listClientToolUses(content) {
  if (!Array.isArray(content)) return [];
  return content.filter((block) => block?.type === 'tool_use' && block?.name && block?.id);
}

/**
 * Anthropic server tools (web_search) never go through executeAutoTool.
 * Collect their names from message content so the action-claim gate can see them.
 */
export function serverToolNamesFromContent(content) {
  const names = [];
  if (!Array.isArray(content)) return names;
  for (const block of content) {
    const n = String(block?.name || '');
    if (n === 'web_search') names.push('web_search');
    if (block?.type === 'web_search_tool_result') names.push('web_search');
  }
  return [...new Set(names)];
}

function mergeToolNames(into, extras) {
  for (const name of extras || []) {
    if (name && !into.includes(name)) into.push(name);
  }
}

/**
 * After a stream/create finalMessage, if there are client tool_use blocks, execute
 * them and continue the conversation until end_turn or maxLoops.
 *
 * @returns {Promise<{
 *   finalMessage: object,
 *   stitchedText: string,
 *   toolsUsed: string[],
 *   toolResults: object[],
 *   saveDraftSucceeded: boolean,
 *   loops: number
 * }>}
 */
export async function continueAfterClientToolUse({
  client,
  model,
  system,
  messages,
  tools,
  maxTokens = 16000,
  finalMessage,
  onToken,
  toolContext = {},
  // Raised from 5. Reading state costs a loop, and Auto is now expected to look
  // before it acts — "build a show from Adam and Erik" is resolve two guests,
  // read their briefs, check for an existing episode, create it, then confirm.
  // At 5 that work stopped halfway and Auto reported what it had managed so far
  // as though it were the whole job.
  maxLoops = 14,
}) {
  let current = finalMessage;
  let stitchedText = extractTextFromContent(current?.content);
  const toolsUsed = [];
  const toolResults = [];
  let saveDraftSucceeded = false;
  let loops = 0;
  let workingMessages = Array.isArray(messages) ? [...messages] : [];
  mergeToolNames(toolsUsed, serverToolNamesFromContent(current?.content));

  while (loops < maxLoops) {
    const clientUses = listClientToolUses(current?.content);
    if (!clientUses.length) break;
    if (current?.stop_reason && current.stop_reason !== 'tool_use') break;

    const resultBlocks = [];
    for (const use of clientUses) {
      toolsUsed.push(use.name);
      const result = await executeAutoTool(use.name, use.input || {}, toolContext);
      toolResults.push({ name: use.name, result });
      if (use.name === 'save_draft' && result?.ok) saveDraftSucceeded = true;
      resultBlocks.push({
        type: 'tool_result',
        tool_use_id: use.id,
        content: JSON.stringify(result),
      });
    }

    workingMessages = [
      ...workingMessages,
      { role: 'assistant', content: current.content },
      { role: 'user', content: resultBlocks },
    ];

    loops += 1;
    if (loops === maxLoops) {
      // Say so rather than letting a truncated run read as a finished one.
      console.warn(`[runClientToolLoop] hit maxLoops (${maxLoops}); tools used: ${toolsUsed.join(', ')}`);
    }
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages: workingMessages,
      tools,
    });
    if (typeof onToken === 'function') {
      stream.on('text', (text) => {
        if (text) onToken(text);
      });
    }
    current = await stream.finalMessage();
    mergeToolNames(toolsUsed, serverToolNamesFromContent(current?.content));
    const chunk = extractTextFromContent(current?.content);
    if (chunk) stitchedText += chunk;

    if (current?.stop_reason === 'end_turn' || current?.stop_reason === 'stop_sequence') {
      break;
    }
  }

  return {
    finalMessage: current,
    stitchedText,
    toolsUsed,
    toolResults,
    saveDraftSucceeded,
    loops,
  };
}
