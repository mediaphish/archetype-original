/**
 * Simple markdown to HTML for FAQ bodies (paragraphs, lists, bold, links).
 * Shared by FAQs page and Accidental CEO (and any other FAQ consumers).
 */
export function markdownToHtml(text) {
  if (!text) return '';

  const blocks = text.split(/\n\n+/);
  let html = '';

  blocks.forEach((block) => {
    block = block.trim();
    if (!block) return;

    const lines = block.split('\n');
    const firstLine = lines[0];

    if (/^[-*]\s/.test(firstLine) || /^\d+\.\s/.test(firstLine)) {
      const isOrdered = /^\d+\.\s/.test(firstLine);
      const tag = isOrdered ? 'ol' : 'ul';

      html += `<${tag} class="list-disc list-inside space-y-2 ml-4 my-4">`;
      lines.forEach((line) => {
        line = line.trim();
        if (!line) return;

        const content = line.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '').trim();
        if (!content) return;

        let processedContent = content
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>');

        processedContent = processedContent.replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" class="text-[#C85A3C] hover:text-[#B54A32] underline">$1</a>'
        );

        html += `<li>${processedContent}</li>`;
      });
      html += `</${tag}>`;
    } else {
      let processedBlock = block
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

      processedBlock = processedBlock.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-[#C85A3C] hover:text-[#B54A32] underline">$1</a>'
      );

      html += `<p class="mb-4">${processedBlock}</p>`;
    }
  });

  return html || `<p>${text}</p>`;
}
