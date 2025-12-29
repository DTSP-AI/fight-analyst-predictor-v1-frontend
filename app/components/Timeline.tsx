'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimestampRange, copyToClipboard } from '../lib/apiClient';
import type { TimestampedClip } from '../lib/types';

interface TimelineProps {
  clips: TimestampedClip[];
  compact?: boolean;
}

export default function Timeline({ clips, compact = false }: TimelineProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (clip: TimestampedClip, index: number) => {
    const text = formatTimestampRange(clip.t0, clip.t1);
    const success = await copyToClipboard(text);

    if (success) {
      setCopiedId(`clip_${index}`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1: return '#ef4444';
      case 2: return '#f97316';
      case 3: return '#eab308';
      case 4: return '#22c55e';
      case 5: return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  };

  const getPriorityGradient = (priority: number): string => {
    switch (priority) {
      case 1: return 'linear-gradient(135deg, #ef4444, #dc2626)';
      case 2: return 'linear-gradient(135deg, #f97316, #ea580c)';
      case 3: return 'linear-gradient(135deg, #eab308, #ca8a04)';
      case 4: return 'linear-gradient(135deg, #22c55e, #16a34a)';
      case 5: return 'linear-gradient(135deg, #6b7280, #4b5563)';
      default: return 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
  };

  if (clips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '40px 20px',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.5 }}>
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
        <div>No clips available</div>
      </motion.div>
    );
  }

  const sortedClips = [...clips].sort((a, b) => a.priority - b.priority);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '10px',
      }}
    >
      <AnimatePresence>
        {sortedClips.map((clip, index) => (
          <motion.div
            key={`clip_${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => handleCopy(clip, index)}
            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
            whileTap={{ scale: 0.99 }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: compact ? '10px 14px' : '14px 18px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              borderLeft: `3px solid ${getPriorityColor(clip.priority)}`,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {/* Timestamp */}
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: compact ? '11px' : '13px',
                color: 'var(--accent-primary)',
                whiteSpace: 'nowrap',
                minWidth: compact ? '90px' : '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{formatTimestampRange(clip.t0, clip.t1)}</span>
              <AnimatePresence>
                {copiedId === `clip_${index}` && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      color: 'var(--success)',
                      fontSize: '10px',
                      fontWeight: 500,
                    }}
                  >
                    Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: compact ? '13px' : '14px',
                  marginBottom: compact ? '2px' : '4px',
                  color: 'var(--text-primary)',
                }}
              >
                {clip.label}
              </div>
              {!compact && clip.coaching_note && (
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}>
                  {clip.coaching_note}
                </div>
              )}
            </div>

            {/* Priority indicator */}
            {!compact && (
              <motion.div
                whileHover={{ scale: 1.1 }}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: getPriorityGradient(clip.priority),
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                P{clip.priority}
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {!compact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            color: 'var(--text-muted)',
            fontSize: '11px',
            textAlign: 'center',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Click any clip to copy timestamp
        </motion.div>
      )}
    </div>
  );
}
