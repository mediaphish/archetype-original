import React, { useState, useEffect } from 'react';
import { getAll, search, getTags, getTypes } from '../lib/knowledge.js';
import { debounce } from '../lib/debounce.js';

export default function Research() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [tags, setTags] = useState([]);
  const [types, setTypes] = useState([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allDocs, allTags, allTypes] = await Promise.all([
          getAll(),
          getTags(),
          getTypes()
        ]);
        
        setDocs(allDocs);
        setTags(allTags);
        setTypes(allTypes);
      } catch (error) {
        console.error('Error loading research data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Debounced search function
  const debouncedSearch = debounce(async (query, tag, type) => {
    try {
      const results = await search({ q: query, tag, type });
      setDocs(results);
    } catch (error) {
      console.error('Error searching:', error);
    }
  }, 300);

  // Handle search changes
  useEffect(() => {
    debouncedSearch(searchQuery, selectedTag, selectedType);
  }, [searchQuery, selectedTag, selectedType]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleTagChange = (e) => {
    setSelectedTag(e.target.value);
  };

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSelectedType('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="text-lg text-gray-600">Loading research corpus...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-[#1A1A1A] mb-4 leading-[0.9] tracking-tight">Research Corpus</h1>
          <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 mb-4 font-light">
            Explore the knowledge base with {docs.length} documents
          </p>
          
          {/* Download link */}
          <div className="mb-6">
            <a 
              href="/knowledge.json" 
              download="knowledge.json"
              className="inline-block bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Download Raw JSON
            </a>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search titles, summaries, content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag
              </label>
              <select
                value={selectedTag}
                onChange={handleTagChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
              >
                <option value="">All Tags</option>
                {tags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={selectedType}
                onChange={handleTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
              >
                <option value="">All Types</option>
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || selectedTag || selectedType) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">No documents found</div>
              <div className="text-sm text-gray-500 mt-2">
                Try adjusting your search or filters
              </div>
            </div>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="mb-3">
                  <h3 className="text-xl font-semibold text-black mb-2">
                    {doc.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {doc.tags && doc.tags.map(tag => (
                      <span 
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {doc.type && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded-full">
                        {doc.type}
                      </span>
                    )}
                  </div>
                </div>
                
                {doc.summary && (
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {doc.summary}
                  </p>
                )}
                
                <div className="text-sm text-gray-500">
                  <span className="font-mono">{doc.id}</span>
                  {doc.created_at && (
                    <span className="ml-4">Created: {doc.created_at}</span>
                  )}
                  {doc.updated_at && doc.updated_at !== doc.created_at && (
                    <span className="ml-4">Updated: {doc.updated_at}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
