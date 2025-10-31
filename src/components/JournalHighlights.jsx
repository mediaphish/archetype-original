import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export default function JournalHighlights() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetch('/knowledge.json');
        const data = await response.json();
        
        if (data.docs && Array.isArray(data.docs)) {
          const journalPosts = data.docs
            .filter(doc => doc.type === 'journal-post')
            .sort((a, b) => new Date(b.publish_date || b.updated_at) - new Date(a.publish_date || a.updated_at))
            .slice(0, 3);
          
          setPosts(journalPosts);
        }
      } catch (error) {
        console.error('Error loading journal posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Generate JSON-LD for ItemList
  const generateJSONLD = () => {
    if (posts.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": posts.map((post, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": post.title,
        "url": `https://www.archetypeoriginal.com/journal/${post.slug}`
      }))
    };
  };

  const jsonLd = generateJSONLD();

  return (
    <section className="section bg-warm-offWhite">
      {jsonLd && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        </Helmet>
      )}
      
      <div className="container">
        <h2 className="h2">From the Journal</h2>
        <p className="text-lg text-warm-gray mb-8">
          Ongoing notes on leadership, culture, clarity, and the work of rebuilding.
        </p>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-warm-gray">Loading journal posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-warm-gray">More entries coming soon.</p>
            <div className="mt-6">
              <a 
                href="/journal" 
                className="inline-flex items-center text-amber hover:text-amber-dark font-medium focus:outline-none focus:ring-2 focus:ring-amber rounded"
              >
                Read the Journal →
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {posts.map((post) => (
                <article 
                  key={post.slug} 
                  className="bg-warm-offWhite border border-warm-border rounded-lg p-6 flex flex-col"
                  aria-label={`Journal post: ${post.title}`}
                >
                  <h3 className="text-lg font-semibold text-warm-charcoal mb-3">
                    <a 
                      href={`/journal/${post.slug}`}
                      className="hover:text-amber transition-colors focus:outline-none focus:ring-2 focus:ring-amber rounded"
                    >
                      {post.title}
                    </a>
                  </h3>
                  <p className="text-base text-warm-gray mb-4 flex-grow line-clamp-3">
                    {post.summary || post.body?.substring(0, 140)}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <time className="text-sm text-warm-gray">
                      {formatDate(post.publish_date || post.updated_at)}
                    </time>
                    <a 
                      href={`/journal/${post.slug}`}
                      className="text-amber hover:text-amber-dark font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber rounded"
                    >
                      Read →
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <div className="text-center">
              <a 
                href="/journal" 
                className="inline-flex items-center text-amber hover:text-amber-dark font-medium focus:outline-none focus:ring-2 focus:ring-amber rounded"
              >
                Read the Journal →
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

