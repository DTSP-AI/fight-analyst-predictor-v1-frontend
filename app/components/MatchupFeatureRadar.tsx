'use client';

import { motion } from 'framer-motion';
import { GitCompare } from 'lucide-react';
import type { MatchupFeatures } from '../lib/predictorTypes';

interface Props {
  features: MatchupFeatures;
}

function DeltaBar({
  label,
  value,
  unit,
  fmt,
}: {
  label: string;
  value: number | null;
  unit: string;
  fmt: (n: number) => string;
}) {
  if (value === null || value === undefined) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace' }}>—</span>
      </div>
    );
  }

  const positive = value > 0;
  const magnitude = Math.min(100, Math.abs(value) * 4); // visual scaling only

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <span>{label}</span>
        <span
          style={{
            fontFamily: 'monospace',
            color: positive ? '#3b82f6' : '#ef4444',
          }}
        >
          {positive ? '+' : ''}
          {fmt(value)} {unit}
        </span>
      </div>
      <div
        style={{
          height: '6px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '3px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Centered axis */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'rgba(255,255,255,0.15)',
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${magnitude / 2}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: positive ? '50%' : `${50 - magnitude / 2}%`,
            background: positive ? '#3b82f6' : '#ef4444',
            borderRadius: '3px',
          }}
        />
      </div>
    </div>
  );
}

function CrossList({
  label,
  items,
  color,
}: {
  label: string;
  items: string[];
  color: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          color,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        {items.map((item, idx) => (
          <li
            key={idx}
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '2px',
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MatchupFeatureRadar({ features }: Props) {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <GitCompare size={16} style={{ color: 'var(--accent-primary)' }} />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Matchup Features
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.04)',
            padding: '3px 8px',
            borderRadius: '10px',
          }}
        >
          {features.style_clash}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Deltas (A − B) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Deltas (A − B)
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Style overlap</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {(features.style_overlap * 100).toFixed(0)}%
            </span>
          </div>

          <DeltaBar
            label="Reach"
            value={features.reach_diff_in}
            unit="in"
            fmt={(n) => n.toFixed(1)}
          />
          <DeltaBar
            label="Age"
            value={features.age_diff_yrs}
            unit="yrs"
            fmt={(n) => n.toFixed(1)}
          />
          <DeltaBar
            label="Layoff"
            value={features.layoff_diff_days}
            unit="days"
            fmt={(n) => n.toFixed(0)}
          />
        </div>

        {/* Cross-pollination */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Cross-pollination
          </div>

          <CrossList
            label={`${features.fighter_a_name} hits B's vulnerabilities`}
            items={features.a_offense_hits_b_vuln}
            color="#3b82f6"
          />
          <CrossList
            label={`${features.fighter_b_name} hits A's vulnerabilities`}
            items={features.b_offense_hits_a_vuln}
            color="#ef4444"
          />
          <CrossList
            label={`${features.fighter_a_name} neutralizes B`}
            items={features.a_defense_neutralizes_b}
            color="#3b82f6"
          />
          <CrossList
            label={`${features.fighter_b_name} neutralizes A`}
            items={features.b_defense_neutralizes_a}
            color="#ef4444"
          />
        </div>
      </div>

      {/* Common opponents */}
      {features.common_opponents.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}
          >
            Common Opponents ({features.common_opponents.length})
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {features.common_opponents.map((opp, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {opp.opponent_display_name}
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#3b82f6',
                  }}
                >
                  A: {opp.a_result ?? '—'}
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#ef4444',
                  }}
                >
                  B: {opp.b_result ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
