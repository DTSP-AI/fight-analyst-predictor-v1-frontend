'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadVideo, APIError } from '../lib/apiClient';
import type { UploadState } from '../lib/types';

interface UploadCardProps {
  onUploadComplete: (videoId: string, filename: string) => void;
}

export default function UploadCard({ onUploadComplete }: UploadCardProps) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setState(prev => ({
        ...prev,
        error: 'Invalid file type. Please upload MP4, MOV, AVI, MKV, or WebM.',
      }));
      return;
    }

    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      setState(prev => ({
        ...prev,
        error: 'File too large. Maximum size is 2GB.',
      }));
      return;
    }

    setState({
      isUploading: true,
      progress: 0,
      error: undefined,
    });

    try {
      const response = await uploadVideo(file, (progress) => {
        setState(prev => ({ ...prev, progress }));
      });

      setState({
        isUploading: false,
        progress: 100,
        videoId: response.video_id,
        filename: response.filename,
      });

      onUploadComplete(response.video_id, response.filename);
    } catch (error) {
      const message = error instanceof APIError
        ? error.detail
        : 'Upload failed. Please try again.';
      setState({
        isUploading: false,
        progress: 0,
        error: message,
      });
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <motion.div
      onClick={!state.isUploading ? handleClick : undefined}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="glass-card glass-card-interactive noise-overlay"
      animate={{
        borderColor: isDragging
          ? 'rgba(59, 130, 246, 0.5)'
          : state.error
          ? 'rgba(239, 68, 68, 0.3)'
          : 'rgba(255, 255, 255, 0.08)',
        backgroundColor: isDragging
          ? 'rgba(59, 130, 246, 0.08)'
          : 'rgba(255, 255, 255, 0.03)',
      }}
      style={{
        border: '2px dashed',
        padding: '48px 24px',
        textAlign: 'center',
        cursor: state.isUploading ? 'default' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={!state.isUploading ? { scale: 1.005 } : {}}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.avi,.mkv,.webm"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <AnimatePresence mode="wait">
        {state.isUploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </motion.div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'var(--text-primary)',
            }}>
              Uploading...
            </div>
            <div className="progress-bar" style={{ maxWidth: '300px', margin: '0 auto' }}>
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${state.progress}%` }}
              />
            </div>
            <div style={{
              marginTop: '12px',
              color: 'var(--text-secondary)',
              fontSize: '14px',
            }}>
              {state.progress}%
            </div>
          </motion.div>
        ) : state.videoId ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </motion.div>
            <div style={{
              fontWeight: 600,
              fontSize: '16px',
              color: 'var(--text-primary)',
            }}>
              {state.filename}
            </div>
            <div style={{
              color: 'var(--success)',
              marginTop: '8px',
              fontSize: '14px',
            }}>
              Ready for analysis
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </motion.div>
            <div style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--text-primary)',
            }}>
              Drop fight video here
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '15px',
            }}>
              or click to browse
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '13px',
              marginTop: '16px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '20px',
              display: 'inline-block',
            }}>
              MP4, MOV, AVI, MKV, WebM (max 2GB)
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              color: 'var(--error)',
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '14px',
            }}
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
