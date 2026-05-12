'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, Zap, AlertTriangle, FileText, Activity } from 'lucide-react';
import type { PredictionReport as PredictionReportType } from '../lib/predictorTypes';

interface Props {
  report: PredictionReportType;
  fighterAName: string;
  fighterBName: string;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function ProbabilityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
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
        <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
          {pct(value)}
        </span>
      </div>
      <div
        style={{
          height: '8px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: color,
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}

function BulletList({
  title,
  icon,
  items,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  color: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <span style={{ color }}>{icon}</span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {title}
        </span>
      </div>
      <ul style={{ margin: 0, paddingLeft: '18px', listStyle: 'disc' }}>
        {items.map((item, idx) => (
          <li
            key={idx}
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '4px',
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PredictionReportView({
  report,
  fighterAName,
  fighterBName,
}: Props) {
  const winnerColor =
    report.predicted_winner.trim().toLowerCase() === fighterAName.trim().toLowerCase()
      ? '#3b82f6'
      : '#ef4444';

  const sortedMethods = Object.entries(report.method_likelihood).sort(
    (a, b) => b[1] - a[1]
  );
  const sortedRounds = Object.entries(report.round_likelihood).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Winner banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{
          padding: '24px',
          borderTop: `3px solid ${winnerColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            background: winnerColor,
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Trophy size={28} style={{ color: '#fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '4px',
            }}
          >
            Predicted Winner
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {report.predicted_winner}
          </div>
        </div>
        <div style={{ minWidth: '160px', flex: 1 }}>
          <ProbabilityBar
            label="Confidence"
            value={report.confidence}
            color={winnerColor}
          />
        </div>
      </motion.div>

      {/* Stat-prediction anchor (if present) */}
      {report.stat_prediction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card"
          style={{ padding: '16px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <Activity size={16} style={{ color: 'var(--accent-secondary)' }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Quantitative Anchor ({report.stat_prediction.method})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <ProbabilityBar
              label={fighterAName}
              value={report.stat_prediction.p_fighter_a}
              color="#3b82f6"
            />
            <ProbabilityBar
              label={fighterBName}
              value={report.stat_prediction.p_fighter_b}
              color="#ef4444"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              95% CI for {fighterAName}: {pct(report.stat_prediction.confidence_band[0])}{' '}
              – {pct(report.stat_prediction.confidence_band[1])}
            </div>
          </div>
          {report.stat_prediction.top_contributors.length > 0 && (
            <details style={{ marginTop: '12px' }}>
              <summary
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Top feature contributions
              </summary>
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {report.stat_prediction.top_contributors.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>{c.feature}</span>
                    <span style={{ color: c.contribution >= 0 ? '#3b82f6' : '#ef4444' }}>
                      {c.contribution >= 0 ? '+' : ''}
                      {c.contribution.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </motion.div>
      )}

      {/* Method + round likelihoods */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {sortedMethods.length > 0 && (
          <div className="glass-card" style={{ padding: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <Target size={16} style={{ color: 'var(--accent-primary)' }} />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Method Likelihood
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedMethods.map(([method, prob]) => (
                <ProbabilityBar
                  key={method}
                  label={method}
                  value={prob}
                  color="var(--accent-primary)"
                />
              ))}
            </div>
          </div>
        )}

        {sortedRounds.length > 0 && (
          <div className="glass-card" style={{ padding: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <Zap size={16} style={{ color: 'var(--accent-secondary)' }} />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Round Likelihood
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedRounds.map(([round, prob]) => (
                <ProbabilityBar
                  key={round}
                  label={round === 'DEC' ? 'Decision' : `Round ${round}`}
                  value={prob}
                  color="var(--accent-secondary)"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reasoning paragraphs */}
      {report.reasoning_paragraphs.length > 0 && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Reasoning
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {report.reasoning_paragraphs.map((p, idx) => (
              <p
                key={idx}
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Honest take */}
      {report.honest_take && (
        <div
          className="glass-card"
          style={{
            padding: '16px',
            borderLeft: '3px solid var(--accent-secondary)',
            background: 'rgba(139,92,246,0.06)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'var(--accent-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            Honest Take
          </div>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            {report.honest_take}
          </p>
        </div>
      )}

      {/* Paths to victory + dangers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}
      >
        <BulletList
          title={`${fighterAName} — Paths to Victory`}
          icon={<Target size={16} />}
          items={report.a_paths_to_victory}
          color="#3b82f6"
        />
        <BulletList
          title={`${fighterBName} — Paths to Victory`}
          icon={<Target size={16} />}
          items={report.b_paths_to_victory}
          color="#ef4444"
        />
        <BulletList
          title={`${fighterAName} — Signature Dangers`}
          icon={<AlertTriangle size={16} />}
          items={report.a_signature_dangers}
          color="#3b82f6"
        />
        <BulletList
          title={`${fighterBName} — Signature Dangers`}
          icon={<AlertTriangle size={16} />}
          items={report.b_signature_dangers}
          color="#ef4444"
        />
      </div>

      {/* X-factors */}
      <BulletList
        title="X-Factors"
        icon={<Zap size={16} />}
        items={report.x_factors}
        color="var(--accent-secondary)"
      />

      {/* Provenance */}
      {report.grounded_in_fights.length > 0 && (
        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            Grounded in {report.grounded_in_fights.length} fight
            {report.grounded_in_fights.length !== 1 ? 's' : ''}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontFamily: 'monospace',
              fontSize: '11px',
            }}
          >
            {report.grounded_in_fights.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Validator failure (if any forbidden terms slipped through) */}
      {!report.forbidden_terms_check_passed && (
        <div
          className="glass-card"
          style={{
            padding: '12px 16px',
            borderLeft: '3px solid var(--warning)',
            background: 'rgba(245,158,11,0.08)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--warning)' }}>
            Validator flagged forbidden terms: {report.forbidden_terms_found.join(', ')}
          </span>
        </div>
      )}

      {/* Footer meta */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          fontFamily: 'monospace',
        }}
      >
        Generated {new Date(report.generated_at).toLocaleString()} · {report.model_used}
      </div>
    </div>
  );
}
