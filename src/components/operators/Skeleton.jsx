import React from 'react';

export default function Skeleton({ className = '', lines = 1, width = '100%' }) {
  if (lines === 1) {
    return (
      <div
        className={`animate-pulse bg-gray-200 rounded ${className}`}
        style={{ width }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 rounded ${className}`}
          style={{ width: i === lines - 1 ? '75%' : width }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <Skeleton className="h-6 mb-4" width="60%" />
      <Skeleton lines={3} className="h-4" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <Skeleton className="h-5" width="40%" />
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
