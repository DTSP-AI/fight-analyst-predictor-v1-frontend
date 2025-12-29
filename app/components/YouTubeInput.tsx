'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

export default function YouTubeInput({ onSubmit, disabled }: YouTubeInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    if (!input.trim()) {
      setError('Please enter a YouTube URL');
      return false;
    }
    if (!YOUTUBE_REGEX.test(input)) {
      setError('Invalid YouTube URL format');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (validateUrl(url)) {
      onSubmit(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      handleSubmit();
    }
  };

  return (
    <motion.div
      className="glass-card noise-overlay"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '32px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <motion.div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: '#ef4444' }}>
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" fill="currentColor"/>
            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"/>
          </svg>
        </motion.div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}>
          Analyze YouTube Video
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
        }}>
          Paste a YouTube URL to analyze fight footage
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://youtube.com/watch?v=..."
          disabled={disabled}
          className="input-glass"
          style={{
            flex: 1,
            fontSize: '15px',
          }}
        />
        <motion.button
          onClick={handleSubmit}
          disabled={disabled || !url.trim()}
          className="btn-primary"
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {disabled ? 'Loading...' : 'Load'}
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            style={{
              color: 'var(--error)',
              marginTop: '12px',
              fontSize: '13px',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        marginTop: '20px',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 'var(--radius-md)',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}>
        Supports: youtube.com/watch, youtu.be, youtube.com/shorts
      </div>
    </motion.div>
  );
}
