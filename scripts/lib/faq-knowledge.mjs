/**
 * Load published FAQ docs from public/knowledge.json.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const KNOWLEDGE_PATH = join(ROOT, 'public', 'knowledge.json');

export function loadPublishedFaqDocs() {
  if (!existsSync(KNOWLEDGE_PATH)) {
    throw new Error('public/knowledge.json missing. Run build-knowledge first.');
  }
  const raw = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
  const docs = raw.docs || raw.documents || [];
  return docs.filter((doc) => {
    if (doc.type !== 'faq') return false;
    if (doc.status != null && String(doc.status).toLowerCase() !== 'published') return false;
    return true;
  });
}
