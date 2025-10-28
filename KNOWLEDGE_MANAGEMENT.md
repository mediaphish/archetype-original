# Knowledge Management System

This system automatically builds and updates the knowledge corpus that Archy uses for responses.

## Automated Daily Updates

The system runs automatically every day at 11 PM UTC via GitHub Actions to:
- Scan for new markdown files in `ao-knowledge-hq-kit/knowledge/`
- Process journal posts from `ao-knowledge-hq-kit/journal/`
- Update `public/knowledge.json` with new content
- Deploy changes to Vercel

## Manual Commands

### Build Knowledge Corpus
```bash
npm run build-knowledge
```
Scans all markdown files and rebuilds the knowledge corpus.

### Update Journal Posts
```bash
npm run update-journal
```
Processes journal posts and adds them to the knowledge corpus.

### List Journal Posts
```bash
npm run list-journal
```
Shows all journal posts that will be included in the knowledge corpus.

## File Structure

```
ao-knowledge-hq-kit/
├── knowledge/           # Main knowledge files
│   ├── accidental-ceo/  # Book chapters
│   ├── servant-leadership/ # Research papers
│   └── scoreboard-leadership/ # Case studies
└── journal/            # Journal posts
    ├── template.md     # Template for new posts
    └── *.md           # Your journal posts

public/
└── knowledge.json     # Generated knowledge corpus
```

## Creating Journal Posts

1. Copy `ao-knowledge-hq-kit/journal/template.md`
2. Fill in the frontmatter (title, slug, publish_date, etc.)
3. Write your content
4. Set `publish_date` to a future date to schedule the post
5. The system will automatically include it when the date arrives

## Frontmatter Fields

- `title`: Post title
- `slug`: URL-friendly identifier
- `publish_date`: When to publish (ISO date string)
- `created_at`: Creation date
- `updated_at`: Last update date
- `summary`: Brief description for search
- `tags`: Array of tags for categorization
- `takeaways`: Key points array
- `applications`: Practical applications array
- `related`: Related content array

## GitHub Secrets Required

For automated deployment, add these secrets to your GitHub repository:

- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

## Troubleshooting

If the automated update fails:
1. Check the GitHub Actions logs
2. Run `npm run build-knowledge` manually
3. Verify file permissions and paths
4. Check for syntax errors in markdown files
