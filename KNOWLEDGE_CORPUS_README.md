# Using the AO Knowledge Corpus

The Archetype Original knowledge corpus provides programmatic access to the research and content library through both client-side and server-side APIs.

## API Endpoints

### GET /api/knowledge
Query the knowledge corpus with filters:

```
GET /api/knowledge?q=trust&tag=scoreboard-leadership&type=behavioral-research
```

**Parameters:**
- `q` (string): Search query (searches title, summary, body)
- `tag` (string): Filter by tag (partial match)
- `type` (string): Filter by document type

**Response:**
```json
{
  "generated_at": "2025-01-27T...",
  "count": 5,
  "docs": [
    {
      "id": "scoreboard-leadership/trust-as-currency.md",
      "title": "Trust as Currency",
      "type": "behavioral-research",
      "tags": ["scoreboard-leadership", "trust", "culture"],
      "summary": "Trust builds through consistent actions...",
      "created_at": "2025-10-27",
      "body": "Full markdown content..."
    }
  ]
}
```

### GET /knowledge.json
Download the complete raw corpus as JSON.

## Client-Side Usage

```javascript
import { getAll, search, getTags, getTypes } from './lib/knowledge.js';

// Get all documents
const docs = await getAll();

// Search with filters
const results = await search({ 
  q: 'leadership', 
  tag: 'scoreboard-leadership' 
});

// Get available tags and types
const tags = await getTags();
const types = await getTypes();
```

## Research Page

Visit `/research` to browse the corpus with a clean interface:
- Search across titles, summaries, and content
- Filter by tags and document types
- Download raw JSON
- Responsive design for mobile/desktop

## SL Repository Integration

To sync knowledge to a Scoreboard Leadership repository:

1. **Copy the sync files:**
   - `scripts/fetch-knowledge.mjs` → `/scripts/fetch-knowledge.mjs`
   - `.github/workflows/sync-knowledge.yml` → `/.github/workflows/sync-knowledge.yml`

2. **Update configuration in `fetch-knowledge.mjs`:**
   ```javascript
   const AO_OWNER = 'your-ao-owner';     // Replace with actual
   const AO_REPO = 'your-ao-repo';       // Replace with actual
   ```

3. **Run locally:**
   ```bash
   node scripts/fetch-knowledge.mjs
   ```

4. **GitHub Action will:**
   - Run daily at 6 AM UTC
   - Trigger on manual dispatch
   - Commit changes only when AO corpus updates
   - Create `public/sl-knowledge.json` with filtered content

The SL sync filters for documents tagged with `scoreboard-leadership` and creates a satellite knowledge base for the Scoreboard Leadership site.
