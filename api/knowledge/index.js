import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Internal API only - no CORS needed

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read the knowledge.json file
    const knowledgePath = path.join(process.cwd(), 'public', 'knowledge.json');
    
    if (!fs.existsSync(knowledgePath)) {
      return res.status(404).json({ 
        error: 'Knowledge corpus not found',
        generated_at: new Date().toISOString(),
        count: 0,
        docs: []
      });
    }

    const rawData = fs.readFileSync(knowledgePath, 'utf8');
    const corpus = JSON.parse(rawData);

    // Extract query parameters
    const { q = '', tag = '', type = '' } = req.query;

    let filteredDocs = corpus.docs || [];

    // Filter by tag
    if (tag) {
      filteredDocs = filteredDocs.filter(doc => 
        doc.tags && doc.tags.some(t => 
          t.toLowerCase().includes(tag.toLowerCase())
        )
      );
    }

    // Filter by type
    if (type) {
      filteredDocs = filteredDocs.filter(doc => 
        doc.type && doc.type.toLowerCase().includes(type.toLowerCase())
      );
    }

    // Search by query
    if (q) {
      const query = q.toLowerCase();
      filteredDocs = filteredDocs.filter(doc => {
        const title = (doc.title || '').toLowerCase();
        const summary = (doc.summary || '').toLowerCase();
        const body = (doc.body || '').toLowerCase();
        
        return title.includes(query) || 
               summary.includes(query) || 
               body.includes(query);
      });
    }

    // Return filtered results
    const response = {
      generated_at: corpus.generated_at,
      count: filteredDocs.length,
      docs: filteredDocs
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error reading knowledge corpus:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      generated_at: new Date().toISOString(),
      count: 0,
      docs: []
    });
  }
}
