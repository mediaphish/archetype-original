import React from 'react';

const SEVERITY_FILL_CLASS = {
  critical: 'bg-red-400',
  caution: 'bg-orange-400',
  neutral: 'bg-slate-300',
};

function fmtVal(n) {
  return (typeof n === 'number' && Number.isFinite(n)) ? n.toFixed(1) : '—';
}

/**
 * Three stacked bars -- Leader (top), Gap (middle), Team (bottom) -- always
 * in that order, all plotted on the same shared 0-100 line so their
 * positions are directly comparable top-to-bottom. Leader's bar always
 * starts at the left edge and runs to the leader's score. Team's bar always
 * ends at the right edge and starts at the team's score. The Gap bar sits
 * exactly between the leader and team positions -- when the leader's score
 * is lower, that's empty space between the Leader and Team bars; when the
 * leader's score is higher, Leader's bar visibly runs past where Team's bar
 * begins, and the Gap bar highlights exactly that overlap. Nothing is
 * layered on top of anything else, so the overlap (when it happens) is
 * visible, not hidden.
 */
export default function GapRangeBar({ leader, team, severity, className = '' }) {
  const hasLeader = typeof leader === 'number' && Number.isFinite(leader);
  const hasTeam = typeof team === 'number' && Number.isFinite(team);
  if (!hasLeader && !hasTeam) return null;

  const leaderPct = hasLeader ? Math.max(0, Math.min(100, leader)) : null;
  const teamPct = hasTeam ? Math.max(0, Math.min(100, team)) : null;
  const gapVal = (hasLeader && hasTeam) ? (leader - team) : null;
  const gapLowPct = (hasLeader && hasTeam) ? Math.min(leaderPct, teamPct) : null;
  const gapWidthPct = (hasLeader && hasTeam) ? Math.abs(leaderPct - teamPct) : null;
  const fillClass = SEVERITY_FILL_CLASS[String(severity || '').toLowerCase()] || SEVERITY_FILL_CLASS.neutral;

  return (
    <div className={className}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-12 shrink-0 text-[11px] font-bold text-blue-700 text-right">Leader</div>
          <div className="flex-1 h-2.5 rounded-full bg-gray-100 relative overflow-hidden">
            {hasLeader ? (
              <div className="absolute inset-y-0 left-0 rounded-full bg-blue-600" style={{ width: `${leaderPct}%` }} />
            ) : null}
          </div>
          <div className="w-11 shrink-0 text-[11px] text-gray-500 tabular-nums">{fmtVal(leader)}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 shrink-0 text-[11px] font-bold text-amber-700 text-right">Gap</div>
          <div className="flex-1 h-2.5 rounded-full bg-gray-100 relative overflow-hidden">
            {gapWidthPct !== null ? (
              <div className={`absolute inset-y-0 rounded-full ${fillClass}`} style={{ left: `${gapLowPct}%`, width: `${gapWidthPct}%` }} />
            ) : null}
          </div>
          <div className="w-11 shrink-0 text-[11px] text-gray-500 tabular-nums">{gapVal !== null ? `${fmtVal(Math.abs(gapVal))}pt` : '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 shrink-0 text-[11px] font-bold text-green-700 text-right">Team</div>
          <div className="flex-1 h-2.5 rounded-full bg-gray-100 relative overflow-hidden">
            {hasTeam ? (
              <div className="absolute inset-y-0 right-0 rounded-full bg-green-600" style={{ width: `${100 - teamPct}%` }} />
            ) : null}
          </div>
          <div className="w-11 shrink-0 text-[11px] text-gray-500 tabular-nums">{fmtVal(team)}</div>
        </div>
      </div>
    </div>
  );
}
