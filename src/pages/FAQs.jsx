/**
 * Universal FAQs Page
 * Searchable, filterable, categorized FAQ system
 */
import React, { useState, useEffect, useMemo } from 'react';

// Simple markdown to HTML converter for FAQ content
const markdownToHtml = (text) => {
  if (!text) return '';
  
  let html = text
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Convert line breaks to <br>
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<p>')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
};

export default function FAQs() {
  const [faqs, setFaqs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Get category from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, []);

  // Load FAQs from knowledge corpus
  useEffect(() => {
    const loadFAQs = async () => {
      try {
        const response = await fetch('/knowledge.json');
        const data = await response.json();
        
        // Filter for FAQs only
        const allFaqs = data.documents?.filter(doc => doc.type === 'faq') || [];
        setFaqs(allFaqs);
        setLoading(false);
      } catch (error) {
        console.error('Error loading FAQs:', error);
        setLoading(false);
      }
    };

    loadFAQs();
  }, []);

  // Get all unique categories from FAQs
  const categories = useMemo(() => {
    const categorySet = new Set();
    faqs.forEach(faq => {
      if (faq.categories && Array.isArray(faq.categories)) {
        faq.categories.forEach(cat => categorySet.add(cat));
      }
    });
    return Array.from(categorySet).sort();
  }, [faqs]);

  // Filter and search FAQs
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      // Category filter
      if (selectedCategory) {
        const hasCategory = faq.categories && faq.categories.includes(selectedCategory);
        if (!hasCategory) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = faq.title?.toLowerCase().includes(query);
        const matchesBody = faq.body?.toLowerCase().includes(query);
        const matchesCategories = faq.categories?.some(cat => cat.toLowerCase().includes(query));
        return matchesTitle || matchesBody || matchesCategories;
      }

      return true;
    });
  }, [faqs, selectedCategory, searchQuery]);

  const toggleFaq = (slug) => {
    const newExpanded = new Set(expandedFaqs);
    if (newExpanded.has(slug)) {
      newExpanded.delete(slug);
    } else {
      newExpanded.add(slug);
    }
    setExpandedFaqs(newExpanded);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    // Update URL to remove query parameters
    window.history.pushState({}, '', '/faqs');
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    // Update URL with category parameter
    if (category) {
      window.history.pushState({}, '', `/faqs?category=${category}`);
    } else {
      window.history.pushState({}, '', '/faqs');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-24 sm:py-32 md:py-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-[#1A1A1A]/70">Loading FAQs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-white py-24 sm:py-32 md:py-40 lg:py-48">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[#1A1A1A] mb-6 sm:mb-8">
              FAQs
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1A1A1A]/70 font-light max-w-3xl mx-auto">
              Find answers to common questions about leadership, culture, and how we work.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="bg-[#FAFAF9] border-b border-[#1A1A1A]/10 sticky top-20 z-30">
        <div className="container mx-auto px-4 sm:px-6 md:px-12 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Search Input */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <svg 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full sm:w-auto px-4 py-3 border border-[#1A1A1A]/20 rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              {(selectedCategory || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-3 text-sm font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {(selectedCategory || searchQuery) && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-[#6B6B6B]">Active filters:</span>
                {selectedCategory && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#C85A3C]/10 text-[#C85A3C] rounded-full text-sm font-medium">
                    {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace(/-/g, ' ')}
                    <button
                      onClick={() => handleCategoryChange('')}
                      className="hover:text-[#C85A3C]/70"
                      aria-label="Remove category filter"
                    >
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A1A1A]/10 text-[#1A1A1A] rounded-full text-sm font-medium">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery('')}
                      className="hover:text-[#1A1A1A]/70"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQs List */}
      <section className="bg-white py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-[#6B6B6B] mb-4">
                  {searchQuery || selectedCategory 
                    ? 'No FAQs found matching your filters.' 
                    : 'No FAQs available at this time.'}
                </p>
                {(searchQuery || selectedCategory) && (
                  <button
                    onClick={clearFilters}
                    className="text-[#C85A3C] hover:text-[#C85A3C]/70 font-medium"
                  >
                    Clear filters to see all FAQs
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-[#6B6B6B] mb-6">
                  Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? 'FAQ' : 'FAQs'}
                  {selectedCategory && ` in "${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace(/-/g, ' ')}"`}
                </div>

                {filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqs.has(faq.slug);
                  return (
                    <div
                      key={faq.slug}
                      className="bg-white border border-[#1A1A1A]/10 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300"
                    >
                      <button
                        onClick={() => toggleFaq(faq.slug)}
                        className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 hover:bg-[#FAFAF9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:ring-inset"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-semibold text-[#1A1A1A] mb-2">
                            {faq.title}
                          </h3>
                          {faq.categories && faq.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {faq.categories.map(category => (
                                <span
                                  key={category}
                                  className="inline-block px-2 py-1 text-xs font-medium text-[#6B6B6B] bg-[#FAFAF9] rounded"
                                >
                                  {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <svg
                          className={`w-6 h-6 text-[#6B6B6B] flex-shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-6 py-5 border-t border-[#1A1A1A]/10 bg-[#FAFAF9]">
                          <div
                            className="prose prose-sm max-w-none text-[#1A1A1A]/80"
                            dangerouslySetInnerHTML={{
                              __html: markdownToHtml(faq.body || '')
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#FAFAF9] py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
              Still have questions?
            </h2>
            <p className="text-lg text-[#1A1A1A]/70 mb-8 max-w-2xl mx-auto">
              Can't find what you're looking for? Chat with Archy or reach out directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/contact');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="bg-[#1A1A1A] text-white px-8 py-4 font-medium hover:bg-[#1A1A1A]/90 transition-colors text-center rounded-lg"
              >
                Contact Us
              </a>
              <button
                onClick={() => {
                  const archyButton = document.querySelector('[data-archy-button]');
                  if (archyButton) archyButton.click();
                }}
                className="bg-transparent text-[#1A1A1A] px-8 py-4 font-medium border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-center rounded-lg"
              >
                Chat with Archy
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

