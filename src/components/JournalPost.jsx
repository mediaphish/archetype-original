import React from 'react';
import SocialShare from './SocialShare.jsx';

export default function JournalPost({ post }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <article className="max-w-4xl mx-auto bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 pb-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <time dateTime={post.publish_date}>
              {formatDate(post.publish_date)}
            </time>
            {post.original_source && (
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                Originally from {post.original_source}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {post.tags && post.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Summary */}
      {post.summary && (
        <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-gray-700 italic">{post.summary}</p>
        </div>
      )}

      {/* Content */}
      <div className="prose prose-lg max-w-none mb-8">
        <div dangerouslySetInnerHTML={{ __html: post.body.replace(/\n/g, '<br>') }} />
      </div>

      {/* Takeaways */}
      {post.takeaways && post.takeaways.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Takeaways</h3>
          <ul className="list-disc list-inside space-y-1">
            {post.takeaways.map((takeaway, index) => (
              <li key={index} className="text-gray-700">{takeaway}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Applications */}
      {post.applications && post.applications.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Applications</h3>
          <ul className="list-disc list-inside space-y-1">
            {post.applications.map((application, index) => (
              <li key={index} className="text-gray-700">{application}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Social Sharing */}
      <SocialShare post={post} />
    </article>
  );
}
