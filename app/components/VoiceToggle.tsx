'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, MessageSquare } from 'lucide-react';

interface VoiceToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  isConnected?: boolean;
  disabled?: boolean;
}

export default function VoiceToggle({
  isEnabled,
  onToggle,
  isConnected = false,
  disabled = false,
}: VoiceToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      className="voice-toggle"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isEnabled ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
        background: isEnabled
          ? 'rgba(59, 130, 246, 0.15)'
          : 'rgba(255, 255, 255, 0.05)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
      }}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {/* Icon */}
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        animate={isEnabled && isConnected ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {isEnabled ? (
          <Mic
            size={16}
            style={{
              color: isConnected ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          />
        ) : (
          <MessageSquare size={16} style={{ color: 'var(--text-secondary)' }} />
        )}
      </motion.div>

      {/* Label */}
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: isEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
        }}
      >
        {isEnabled ? 'Voice' : 'Text'}
      </span>

      {/* Connection indicator */}
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isConnected ? '#22c55e' : '#f59e0b',
          }}
        />
      )}
    </motion.button>
  );
}
