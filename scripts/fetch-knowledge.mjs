import https from 'https';
import fs from 'fs';
import path from 'path';

// Configuration - UPDATE THESE VALUES
const AO_OWNER = 'mediaphish'; // Replace with actual AO repository owner
const AO_REPO = 'archetype-original'; // Replace with actual AO repository name
const TARGET_TAG = 'scoreboard-leadership';

const KNOWLEDGE_URL = `https://raw.githubusercontent.com/${AO_OWNER}/${AO_REPO}/main/public/knowledge.json`;
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'sl-knowledge.json');

/**
 * Fetch knowledge corpus from AO repository
 */
async function fetchKnowledge() {
  return new Promise((resolve, reject) => {
    https.get(KNOWLEDGE_URL, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const corpus = JSON.parse(data);
          resolve(corpus);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch knowledge: ${error.message}`));
    });
  });
}

/**
 * Filter documents by scoreboard-leadership tag
 */
function filterScoreboardLeadership(docs) {
  return docs.filter(doc => 
    doc.tags && doc.tags.some(tag => 
      tag.toLowerCase().includes(TARGET_TAG.toLowerCase())
    )
  );
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log(`Fetching knowledge corpus from ${KNOWLEDGE_URL}...`);
    
    const corpus = await fetchKnowledge();
    console.log(`Loaded ${corpus.count} total documents`);
    
    // Filter for scoreboard-leadership content
    const filteredDocs = filterScoreboardLeadership(corpus.docs || []);
    console.log(`Filtered to ${filteredDocs.length} scoreboard-leadership documents`);
    
    // Create filtered corpus
    const filteredCorpus = {
      generated_at: corpus.generated_at,
      source: {
        owner: AO_OWNER,
        repo: AO_REPO,
        url: KNOWLEDGE_URL,
        filtered_at: new Date().toISOString()
      },
      count: filteredDocs.length,
      docs: filteredDocs
    };
    
    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write filtered corpus
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(filteredCorpus, null, 2));
    console.log(`✅ Wrote ${filteredDocs.length} documents to ${OUTPUT_PATH}`);
    
    // Log some stats
    if (filteredDocs.length > 0) {
      const types = [...new Set(filteredDocs.map(doc => doc.type))];
      const tags = [...new Set(filteredDocs.flatMap(doc => doc.tags || []))];
      
      console.log(`📊 Document types: ${types.join(', ')}`);
      console.log(`🏷️  Tags: ${tags.slice(0, 5).join(', ')}${tags.length > 5 ? '...' : ''}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
