'use client';

import { motion } from 'framer-motion';
import { User, Activity, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { AthleteProfile, CampIntel } from '../lib/predictorTypes';

interface Props {
  fighterName: string;
  profile: AthleteProfile | null;
  campIntel?: CampIntel | null;
  accentColor: string;
  defaultExpanded?: boolean;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        padding: '4px 0',
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// topN helper was used by the now-stripped recurring_offense /
// recurring_vulnerabilities rendering. Removed in Phase 1.

export default function AthleteProfileCard({
  fighterName,
  profile,
  campIntel,
  accentColor,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const recordStr = profile
    ? `${profile.wins}-${profile.losses}${
        profile.draws_or_nc > 0 ? `-${profile.draws_or_nc}` : ''
      }`
    : '—';

  // Phase 1 strip: style classification was removed from AthleteProfile.
  // Header now shows finish rate as the secondary identifier.
  const finishStr = profile
    ? `finish rate ${profile.finish_rate.toFixed(2)}`
    : '—';

  return (
    <motion.div
      layout
      className="glass-card"
      style={{
        borderTop: `3px solid ${accentColor}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left',
        }}
      >
        <User size={18} style={{ color: accentColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fighterName}
          </div>
          {profile && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              {recordStr} in window · {finishStr} · {profile.fights_analyzed} fight
              {profile.fights_analyzed !== 1 ? 's' : ''} analyzed
            </div>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </button>

      {/* Expanded content */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        {!profile ? (
          <div
            style={{
              padding: '14px 16px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--glass-border)',
            }}
          >
            Profile not yet built — pipeline still running.
          </div>
        ) : (
          <div
            style={{
              padding: '12px 16px 16px',
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Quick stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px',
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                }}
              >
                <StatRow label="Record" value={recordStr} />
                <StatRow
                  label="Finish rate"
                  value={`${Math.round(profile.finish_rate * 100)}%`}
                />
                <StatRow
                  label="Verified fights"
                  value={`${profile.verified_fight_count}/${profile.fights_analyzed}`}
                />
              </div>
              {/* Career averages (real ufcstats numbers) replace the
                  stripped cardio/dominance fields. */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                }}
              >
                {profile.career_stats?.sig_strikes_landed_per_min !== undefined && (
                  <StatRow
                    label="SLpM"
                    value={profile.career_stats.sig_strikes_landed_per_min.toFixed(2)}
                  />
                )}
                {profile.career_stats?.sig_strike_accuracy_pct !== undefined && (
                  <StatRow
                    label="Str. Acc."
                    value={`${profile.career_stats.sig_strike_accuracy_pct.toFixed(0)}%`}
                  />
                )}
                {profile.career_stats?.sig_strike_defense_pct !== undefined && (
                  <StatRow
                    label="Str. Def."
                    value={`${profile.career_stats.sig_strike_defense_pct.toFixed(0)}%`}
                  />
                )}
                {profile.career_stats?.takedown_defense_pct !== undefined && (
                  <StatRow
                    label="TD Def."
                    value={`${profile.career_stats.takedown_defense_pct.toFixed(0)}%`}
                  />
                )}
              </div>
            </div>

            {/* Method breakdown */}
            {Object.keys(profile.method_breakdown).length > 0 && (
              <div>
                <SectionLabel icon={<Activity size={14} />} text="Methods" />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(profile.method_breakdown).map(([method, count]) => (
                    <span
                      key={method}
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '4px 8px',
                        borderRadius: '10px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {method}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Camp intel */}
            {campIntel && (
              <div
                style={{
                  background: 'rgba(139,92,246,0.06)',
                  borderLeft: '3px solid var(--accent-secondary)',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Camp Intel
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {campIntel.camp_name && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Camp:</strong>{' '}
                      {campIntel.camp_name}
                    </div>
                  )}
                  {campIntel.head_coach && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Head coach:</strong>{' '}
                      {campIntel.head_coach}
                    </div>
                  )}
                  {campIntel.layoff_days !== null && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Layoff:</strong>{' '}
                      {campIntel.layoff_days} days
                    </div>
                  )}
                  {campIntel.injury_notes && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Injury:</strong>{' '}
                      {campIntel.injury_notes}
                    </div>
                  )}
                  {campIntel.recent_trends && (
                    <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                      {campIntel.recent_trends}
                    </div>
                  )}
                  {campIntel.blocked_terms_detected.length > 0 && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--warning)',
                        marginTop: '4px',
                      }}
                    >
                      Blocked: {campIntel.blocked_terms_detected.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 600,
      }}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}
