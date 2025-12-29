'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FightReport, PatternObservation, RoundBreakdown, TrainingRecommendation } from '../lib/types';
import Timeline from './Timeline';
import { formatTimestamp } from '../lib/apiClient';

interface ReportViewProps {
  report: FightReport;
}

type TabId = 'summary' | 'patterns' | 'rounds' | 'clips' | 'training';

export default function ReportView({ report }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'Summary', icon: <SummaryIcon /> },
    { id: 'patterns', label: 'Patterns', icon: <PatternsIcon /> },
    { id: 'rounds', label: 'Rounds', icon: <RoundsIcon /> },
    { id: 'clips', label: 'Clips', icon: <ClipsIcon /> },
    { id: 'training', label: 'Training', icon: <TrainingIcon /> },
  ];

  return (
    <div className="glass-card noise-overlay" style={{ overflow: 'hidden', position: 'relative' }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--glass-border)',
          overflowX: 'auto',
          padding: '0 8px',
        }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              position: 'relative',
            }}
            whileHover={{ color: 'var(--text-primary)' }}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'var(--accent-gradient)',
                }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxHeight: '600px', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'summary' && <SummaryTab report={report} />}
            {activeTab === 'patterns' && <PatternsTab report={report} />}
            {activeTab === 'rounds' && <RoundsTab rounds={report.round_by_round} />}
            {activeTab === 'clips' && <Timeline clips={report.timestamped_clips} />}
            {activeTab === 'training' && <TrainingTab recommendations={report.training_plan} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SummaryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  );
}

function PatternsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 16v-4"></path>
      <path d="M12 8h.01"></path>
    </svg>
  );
}

function RoundsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function ClipsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>
  );
}

function TrainingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  );
}

function SummaryTab({ report }: { report: FightReport }) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.7,
          color: 'var(--text-secondary)',
          fontSize: '14px',
        }}>
          {report.summary}
        </div>
      </motion.div>

      {report.fighter_a_assessment && report.fighter_a_assessment.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(59, 130, 246, 0.08)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--accent-primary)',
          }}
        >
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--accent-primary)',
          }}>
            {report.fighter_a?.name || 'Fighter A'} Assessment
          </h3>
          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            {report.fighter_a_assessment.map((point, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{point}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {report.fighter_b_assessment && report.fighter_b_assessment.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--error)',
          }}
        >
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--error)',
          }}>
            {report.fighter_b?.name || 'Fighter B'} Assessment
          </h3>
          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            {report.fighter_b_assessment.map((point, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{point}</li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginTop: '24px',
        }}
      >
        <StatCard label="Duration" value={`${Math.round(report.total_duration_sec / 60)}min`} />
        <StatCard label="Frames" value={report.frames_analyzed.toString()} />
        <StatCard label="Key Clips" value={report.timestamped_clips.length.toString()} />
        <StatCard label="Training" value={report.training_plan.length.toString()} />
      </motion.div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      style={{
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}
    >
      <div style={{
        fontSize: '28px',
        fontWeight: 700,
        background: 'var(--accent-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {value}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{label}</div>
    </motion.div>
  );
}

function PatternsTab({ report }: { report: FightReport }) {
  const patternSections = [
    { title: 'Stance & Positioning', data: report.stance_and_positioning },
    { title: 'Offense Patterns', data: report.offense_patterns },
    { title: 'Defense Patterns', data: report.defense_patterns },
    { title: 'Range Management', data: report.range_management },
    { title: 'Tells & Timing', data: report.tells_and_timing },
  ];

  return (
    <div>
      {patternSections.map((section, sectionIndex) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sectionIndex * 0.1 }}
          style={{ marginBottom: '24px' }}
        >
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '12px',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '4px',
              height: '16px',
              background: 'var(--accent-gradient)',
              borderRadius: '2px',
            }} />
            {section.title}
          </h3>
          {section.data.length > 0 ? (
            <PatternList patterns={section.data} />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No patterns identified</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function PatternList({ patterns }: { patterns: PatternObservation[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {patterns.map((pattern, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.01 }}
          style={{
            padding: '14px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>{pattern.pattern}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Frequency: {pattern.frequency}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {pattern.coaching_note}
          </div>
          {pattern.timestamps.length > 0 && (
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '10px',
              fontFamily: 'monospace',
            }}>
              @ {pattern.timestamps.slice(0, 5).map(t => formatTimestamp(t)).join(', ')}
              {pattern.timestamps.length > 5 && ` +${pattern.timestamps.length - 5} more`}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function RoundsTab({ rounds }: { rounds: RoundBreakdown[] }) {
  if (rounds.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No round breakdown available</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {rounds.map((round, index) => (
        <motion.div
          key={round.round_num}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{
            padding: '18px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <h4 style={{
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                {round.round_num}
              </span>
              Round {round.round_num}
            </h4>
            {round.dominant_fighter && (
              <span style={{
                padding: '4px 12px',
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: '20px',
                fontSize: '11px',
                color: 'var(--success)',
                fontWeight: 500,
              }}>
                Dominant: {round.dominant_fighter}
              </span>
            )}
          </div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '14px', lineHeight: 1.6 }}>
            {round.summary}
          </div>
          {round.key_moments.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                Key Moments
              </div>
              {round.key_moments.map((moment, momentIndex) => (
                <motion.div
                  key={momentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + momentIndex * 0.05 }}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '8px',
                    borderLeft: '2px solid var(--accent-secondary)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                    {formatTimestamp(moment.timestamp_sec)}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>{moment.description}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function TrainingTab({ recommendations }: { recommendations: TrainingRecommendation[] }) {
  if (recommendations.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No training recommendations available</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {recommendations.map((rec, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{
            padding: '18px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <h4 style={{
            fontSize: '15px',
            fontWeight: 600,
            marginBottom: '14px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
            }} />
            {rec.theme}
          </h4>

          {rec.drills.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>
                Drills
              </div>
              {rec.drills.map((drill, drillIndex) => (
                <motion.div
                  key={drillIndex}
                  whileHover={{ scale: 1.01 }}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {drill.name}
                    <span style={{
                      color: 'var(--text-muted)',
                      fontWeight: 400,
                      fontSize: '12px',
                      padding: '2px 8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                    }}>
                      {drill.duration_minutes} min
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                    {drill.description}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {rec.sparring_constraints.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>
                Sparring Constraints
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {rec.sparring_constraints.map((constraint, i) => (
                  <li key={i} style={{ fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    {constraint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rec.notes && (
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              paddingTop: '10px',
              borderTop: '1px solid var(--glass-border)',
            }}>
              {rec.notes}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
