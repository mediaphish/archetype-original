import React from 'react';

const SEVERITY_SEGMENT_CLASS = {
  critical: 'bg-red-400',
  caution: 'bg-orange-400',
  neutral: 'bg-slate-300',
};

function fmtVal(n) {
  return (typeof n === 'number' && Number.isFinite(n)) ? n.toFixed(1) : '—';
}

/**
 * Single-line, three-segment range bar: Leader value -- Gap -- Team value,
 * plotted on a shared 0-100 track. The middle segment (between the leader
 * and team positions) is the gap, colored by severity. Used on the
 * Dashboard's Leadership Mirror card and the full Leadership Mirror page,
 * so the gap reads the same everywhere it appears.
 */
export default function GapRangeBar({ leader, team, severity, className = '' }) {
  const hasLeader = typeof leader === 'number' && Number.isFinite(leader);
  const hasTeam = typeof team === 'number' && Number.isFinite(team);
  if (!hasLeader && !hasTeam) return null;

  const leaderPct = hasLeader ? Math.max(0, Math.min(100, leader)) : null;
  const teamPct = hasTeam ? Math.max(0, Math.min(100, team)) : null;
  const lowPct = Math.min(leaderPct ?? teamPct, teamPct ?? leaderPct);
  const highPct = Math.max(leaderPct ?? teamPct, teamPct ?? leaderPct);
  const gapVal = (hasLeader && hasTeam) ? (leader - team) : null;
  const segClass = SEVERITY_SEGMENT_CLASS[String(severity || '').toLowerCase()] || SEVERITY_SEGMENT_CLASS.neutral;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
        <span className="text-blue-700">Leader {fmtVal(leader)}</span>
        {gapVal !== null ? (
          <span className="text-gray-500 font-medium">Gap {gapVal > 0 ? '+' : ''}{fmtVal(gapVal)}pt</span>
        ) : null}
        <span className="text-green-700">Team {fmtVal(team)}</span>
      </div>
      <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`absolute inset-y-0 ${segClass}`}
          style={{ left: `${lowPct}%`, width: `${Math.max(0, highPct - lowPct)}%` }}
        />
        {hasLeader ? (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow"
            style={{ left: `calc(${leaderPct}% - 5px)` }}
            title={`Leader: ${fmtVal(leader)}`}
          />
        ) : null}
        {hasTeam ? (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-600 border-2 border-white shadow"
            style={{ left: `calc(${teamPct}% - 5px)` }}
            title={`Team: ${fmtVal(team)}`}
          />
        ) : null}
      </div>
    </div>
  );
}
