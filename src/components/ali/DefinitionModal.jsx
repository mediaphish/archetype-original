import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import AliArchyDrawer from './AliArchyDrawer';

const DefinitionModal = ({ isOpen, onClose, title, content, sectionKey, onOpenArchy }) => {
  const [showArchy, setShowArchy] = React.useState(false);

  const getArchyContextPayload = React.useCallback(
    () => ({
      type: 'ali-dashboard-definition',
      sectionKey: sectionKey || null,
      definitionTitle: title || null,
    }),
    [sectionKey, title]
  );

  if (!isOpen) return null;

  const handleOpenArchy = () => {
    setShowArchy(true);
    if (onOpenArchy) {
      onOpenArchy(sectionKey);
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="prose prose-sm max-w-none">
              {content}
            </div>
          </div>

          {/* Footer with Archy Button */}
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-600">
                Want to dive deeper? Ask Archy about this section.
              </p>
              <button
                onClick={handleOpenArchy}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with Archy
              </button>
            </div>
          </div>
        </div>
      </div>

      <AliArchyDrawer
        open={showArchy}
        onClose={() => setShowArchy(false)}
        context="ali-dashboard"
        initialMessage={`I'm looking at the ${title} section on my ALI dashboard. Can you help me understand what I'm seeing?`}
        getContextPayload={getArchyContextPayload}
      />
    </>
  );
};

export default DefinitionModal;

