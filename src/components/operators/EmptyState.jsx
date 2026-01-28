import React from 'react';
import { Calendar, Users, FileText, AlertCircle, Plus } from 'lucide-react';

const icons = {
  events: Calendar,
  candidates: Users,
  dashboard: AlertCircle,
  default: FileText,
};

export default function EmptyState({
  icon = 'default',
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}) {
  const Icon = icons[icon] || icons.default;

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyEvents({ onCreateEvent }) {
  return (
    <EmptyState
      icon="events"
      title="No events found"
      message="Get started by creating your first event. Events allow Operators to RSVP, check in, and vote for ROI winners."
      actionLabel="Create Event"
      onAction={onCreateEvent}
    />
  );
}

export function EmptyCandidates() {
  return (
    <EmptyState
      icon="candidates"
      title="No candidates found"
      message="Candidates will appear here once they submit applications for events."
    />
  );
}

export function EmptyDashboard() {
  return (
    <EmptyState
      icon="dashboard"
      title="No data available"
      message="Dashboard metrics will appear here once you have events and activity in the system."
    />
  );
}
