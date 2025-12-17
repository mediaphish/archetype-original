/**
 * Featured FAQs Component
 * Displays featured FAQs for a specific page/section
 */
import React, { useState, useEffect } from 'react';

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

export default function FeaturedFAQs({ pageKey, limit = 5, showViewAll = true }) {
  const [faqs, setFaqs] = useState([]);
  const [expandedFaqs, setExpandedFaqs] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedFAQs = async () => {
      try {
        const response = await fetch('/knowledge.json');
        const data = await response.json();
        
        // Filter for FAQs that are featured on this page
        const allFaqs = data.documents?.filter(doc => {
          if (doc.type !== 'faq') return false;
          if (!doc.featured) return false;
          if (doc.featured_on && Array.isArray(doc.featured_on)) {
            return doc.featured_on.includes(pageKey);
          }
          return false;
        }) || [];
        
        // Limit the number shown
        const limitedFaqs = allFaqs.slice(0, limit);
        setFaqs(limitedFaqs);
        setLoading(false);
      } catch (error) {
        console.error('Error loading featured FAQs:', error);
        setLoading(false);
      }
    };

    if (pageKey) {
      loadFeaturedFAQs();
    }
  }, [pageKey, limit]);

  const toggleFaq = (slug) => {
    const newExpanded = new Set(expandedFaqs);
    if (newExpanded.has(slug)) {
      newExpanded.delete(slug);
    } else {
      newExpanded.add(slug);
    }
    setExpandedFaqs(newExpanded);
  };

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (faqs.length === 0) {
    return null; // Don't render if no featured FAQs
  }

  return (
    <section className="bg-white py-16 sm:py-20 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]">
              Frequently Asked Questions
            </h2>
            {showViewAll && (
              <a
                href={`/faqs?category=${pageKey}`}
                onClick={(e) => handleLinkClick(e, `/faqs?category=${pageKey}`)}
                className="text-[#C85A3C] hover:text-[#C85A3C]/70 font-medium text-sm sm:text-base transition-colors"
              >
                View All →
              </a>
            )}
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => {
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
        </div>
      </div>
    </section>
  );
}

