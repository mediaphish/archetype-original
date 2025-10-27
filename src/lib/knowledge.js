let knowledgeCache = null;
let loadPromise = null;

/**
 * Load knowledge corpus from public/knowledge.json
 * Caches the result in module scope
 */
async function load() {
  if (knowledgeCache) {
    return knowledgeCache;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/knowledge.json');
      if (!response.ok) {
        throw new Error(`Failed to load knowledge: ${response.status}`);
      }
      knowledgeCache = await response.json();
      return knowledgeCache;
    } catch (error) {
      console.error('Error loading knowledge corpus:', error);
      // Return empty structure on error
      knowledgeCache = {
        generated_at: new Date().toISOString(),
        count: 0,
        docs: []
      };
      return knowledgeCache;
    }
  })();

  return loadPromise;
}

/**
 * Get all documents from the knowledge corpus
 */
export async function getAll() {
  const corpus = await load();
  return corpus.docs || [];
}

/**
 * Search documents by query, tag, and type
 * @param {Object} options - Search options
 * @param {string} options.q - Search query (searches title, summary, body)
 * @param {string} options.tag - Filter by tag
 * @param {string} options.type - Filter by type
 */
export async function search({ q = '', tag = '', type = '' } = {}) {
  const docs = await getAll();
  
  let filtered = docs;

  // Filter by tag
  if (tag) {
    filtered = filtered.filter(doc => 
      doc.tags && doc.tags.some(t => 
        t.toLowerCase().includes(tag.toLowerCase())
      )
    );
  }

  // Filter by type
  if (type) {
    filtered = filtered.filter(doc => 
      doc.type && doc.type.toLowerCase().includes(type.toLowerCase())
    );
  }

  // Search by query
  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(doc => {
      const title = (doc.title || '').toLowerCase();
      const summary = (doc.summary || '').toLowerCase();
      const body = (doc.body || '').toLowerCase();
      
      return title.includes(query) || 
             summary.includes(query) || 
             body.includes(query);
    });
  }

  return filtered;
}

/**
 * Get unique tags from all documents
 */
export async function getTags() {
  const docs = await getAll();
  const tagSet = new Set();
  
  docs.forEach(doc => {
    if (doc.tags) {
      doc.tags.forEach(tag => tagSet.add(tag));
    }
  });
  
  return Array.from(tagSet).sort();
}

/**
 * Get unique types from all documents
 */
export async function getTypes() {
  const docs = await getAll();
  const typeSet = new Set();
  
  docs.forEach(doc => {
    if (doc.type) {
      typeSet.add(doc.type);
    }
  });
  
  return Array.from(typeSet).sort();
}
