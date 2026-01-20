import React from 'react';

export default function AliFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-10">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Archetype Original
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/terms" className="text-gray-600 hover:text-gray-900">Terms</a>
            <a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

