'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronDown, MessageSquare, Loader2, Clock, Swords, Download, X, Zap, Maximize2, Minimize2, Target } from 'lucide-react';
import YouTubeInput from './components/YouTubeInput';
import YouTubePlayer from './components/YouTubePlayer';
import ChatPanel from './components/ChatPanel';
import { startAnalysis, pollAnalysisStatus, APIError } from './lib/apiClient';
import type { AnalysisState, FighterInfo, TimestampedClip } from './lib/types';

// Expandable Fighter Card Component
function FighterCard({
  fighter,
  assessment,
  color,
  isExpanded,
  onToggle,
}: {
  fighter?: FighterInfo;
  assessment?: string[];  // Now bullet points
  color: 'blue' | 'red';
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colors = color === 'blue'
    ? { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', accent: '#3b82f6' }
    : { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', accent: '#ef4444' };

  return (
    <motion.div
      layout
      style={{
        background: colors.bg,
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={onToggle}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Fighter Name Header */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={18} style={{ color: colors.accent }} />
          <span style={{
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {(() => {
              const name = fighter?.name || 'Unknown Fighter';
              // Truncate at first | character and trim
              const cleanName = name.split('|')[0].trim();
              return cleanName.length > 30 ? cleanName.slice(0, 30) + '...' : cleanName;
            })()}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </div>

      {/* Expandable Content - Bullet Points */}
      <AnimatePresence>
        {isExpanded && assessment && assessment.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div style={{
              padding: '0 16px 16px 16px',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '14px',
            }}>
              <ul style={{
                margin: 0,
                paddingLeft: '18px',
                listStyle: 'disc',
              }}>
                {assessment.map((point, idx) => (
                  <li key={idx} style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: '6px',
                  }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isAnalyzing: false,
    status: 'pending',
    progress: 0,
  });
  const [expandedFighter, setExpandedFighter] = useState<'a' | 'b' | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [videoBottom, setVideoBottom] = useState(0);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Check for first-time visitor and show welcome popup
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('fightAnalyst_welcomeSeen');
    if (!hasSeenWelcome) {
      setShowWelcomePopup(true);
    }
  }, []);

  const handleCloseWelcome = () => {
    localStorage.setItem('fightAnalyst_welcomeSeen', 'true');
    setShowWelcomePopup(false);
  };

  // Track video container bottom position for mobile chat.
  // rAF-throttled: scroll/resize fire per-frame or faster, and an unthrottled
  // setState here re-renders the whole page on every scroll tick.
  useEffect(() => {
    let rafId: number | null = null;
    const updateVideoBottom = () => {
      if (videoContainerRef.current) {
        const rect = videoContainerRef.current.getBoundingClientRect();
        setVideoBottom(rect.bottom);
      }
    };
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateVideoBottom();
      });
    };
    updateVideoBottom();
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
    };
  }, [youtubeUrl]);

  // Handler for Key Moment clicks - auto-prompts chat
  const handleKeyMomentClick = useCallback((clip: TimestampedClip) => {
    const time = `${Math.floor(clip.t0 / 60)}:${String(Math.floor(clip.t0 % 60)).padStart(2, '0')}`;
    setPendingChatMessage(`Break down what happened at ${time}: "${clip.label}"`);
  }, []);

  // Detect mobile screen size (rAF-throttled; setState only on actual change)
  useEffect(() => {
    let rafId: number | null = null;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    const scheduleCheck = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        checkMobile();
      });
    };
    checkMobile();
    window.addEventListener('resize', scheduleCheck, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleCheck);
    };
  }, []);

  const handleYouTubeSubmit = useCallback(async (url: string) => {
    setYoutubeUrl(url);
    setAnalysis({
      isAnalyzing: true,
      status: 'pending',
      progress: 5,
      currentStep: 'Fetching video info...',
    });

    try {
      const response = await startAnalysis({ youtube_url: url });
      setAnalysis(prev => ({
        ...prev,
        analysisId: response.analysis_id,
        progress: 10,
      }));

      const finalStatus = await pollAnalysisStatus(
        response.analysis_id,
        (status) => {
          setAnalysis(prev => ({
            ...prev,
            status: status.status,
            progress: status.progress_pct,
            currentStep: status.current_step || undefined,
            error: status.error_message || undefined,
            report: status.report || undefined,
          }));
        }
      );

      setAnalysis({
        isAnalyzing: false,
        analysisId: response.analysis_id,
        status: finalStatus.status,
        progress: 100,
        report: finalStatus.report || undefined,
        error: finalStatus.error_message || undefined,
      });

    } catch (error) {
      const message = error instanceof APIError
        ? error.detail
        : 'Analysis failed. Please try again.';

      setAnalysis(prev => ({
        ...prev,
        isAnalyzing: false,
        status: 'failed',
        error: message,
      }));
    }
  }, []);

  const handleReset = () => {
    setYoutubeUrl(null);
    setExpandedFighter(null);
    setAnalysis({
      isAnalyzing: false,
      status: 'pending',
      progress: 0,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <main style={{
      minHeight: '100vh',
      padding: isMobile ? '12px 8px' : '32px 20px',
      position: 'relative',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: isMobile ? '12px' : '32px',
          textAlign: 'center',
          flexDirection: 'column',
        }}>
          <h1 style={{
            fontSize: isMobile ? '20px' : '36px',
            fontWeight: 700,
            margin: 0,
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {isMobile ? 'Fight Analyst' : 'The Fight Analyst'}
          </h1>
          {!isMobile && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
              AI-powered fight breakdown
            </p>
          )}
        </header>

        {/* URL Input */}
        {!youtubeUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: '600px', margin: '0 auto' }}
          >
            <YouTubeInput onSubmit={handleYouTubeSubmit} disabled={false} />
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence>
          {youtubeUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Video Player - 100% width on mobile */}
              <div
                ref={videoContainerRef}
                style={{
                  marginBottom: isMobile ? '8px' : '20px',
                  width: '100%',
                }}
              >
                <YouTubePlayer url={youtubeUrl} />
              </div>

              {/* Progress Bar */}
              {analysis.isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="glass-card"
                  style={{ padding: '16px', marginBottom: '20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Loader2 size={18} className="spin" style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Breaking down the fight...
                    </span>
                  </div>
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${analysis.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {analysis.currentStep || 'Processing...'}
                  </p>
                </motion.div>
              )}

              {/* Analysis Content Wrapper for PDF Export */}
              <div id="analysis-content">
              {/* === EVENT INFO (subtle badge) === */}
              {analysis.report && (analysis.report.event || analysis.report.matchup_number) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  {analysis.report.event && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.3px',
                    }}>
                      {analysis.report.event}
                    </span>
                  )}
                  {analysis.report.matchup_number && analysis.report.matchup_number > 1 && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}>
                      {analysis.report.matchup_number === 2 ? '2nd Meeting' :
                       analysis.report.matchup_number === 3 ? '3rd Meeting' :
                       `${analysis.report.matchup_number}th Meeting`}
                    </span>
                  )}
                </motion.div>
              )}


              {/* === 1. FIGHTER CARDS (Expandable) === */}
              {analysis.report && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: '12px',
                    marginBottom: isMobile ? '12px' : '20px',
                  }}
                >
                  <FighterCard
                    fighter={analysis.report.fighter_a}
                    assessment={analysis.report.fighter_a_assessment}
                    color="blue"
                    isExpanded={expandedFighter === 'a'}
                    onToggle={() => setExpandedFighter(expandedFighter === 'a' ? null : 'a')}
                  />
                  <FighterCard
                    fighter={analysis.report.fighter_b}
                    assessment={analysis.report.fighter_b_assessment}
                    color="red"
                    isExpanded={expandedFighter === 'b'}
                    onToggle={() => setExpandedFighter(expandedFighter === 'b' ? null : 'b')}
                  />
                </motion.div>
              )}

              {/* === 2. FIGHT ANALYSIS === */}
              {analysis.report && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card"
                  style={{ padding: isMobile ? '14px' : '20px', marginBottom: isMobile ? '12px' : '20px' }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: isMobile ? '12px' : '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Swords size={isMobile ? 16 : 18} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{
                        fontSize: isMobile ? '13px' : '15px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        The Breakdown
                      </span>
                    </div>
                    <motion.button
                      onClick={handleReset}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      New Analysis
                    </motion.button>
                  </div>

                  <p style={{
                    fontSize: isMobile ? '14px' : '15px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {analysis.report.summary}
                  </p>

                  {/* Coaching Insights inline */}
                  {analysis.report.coaching_insights && (
                    <div style={{
                      marginTop: isMobile ? '12px' : '16px',
                      padding: isMobile ? '12px' : '14px',
                      background: 'rgba(139, 92, 246, 0.06)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #8b5cf6',
                    }}>
                      <p style={{
                        fontSize: isMobile ? '13px' : '14px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.7,
                        margin: 0,
                        fontStyle: 'italic',
                      }}>
                        {analysis.report.coaching_insights}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* === 3. KEY MOMENTS (max 5) === */}
              {analysis.report?.timestamped_clips && analysis.report.timestamped_clips.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass-card"
                  style={{ padding: isMobile ? '14px' : '20px', marginBottom: isMobile ? '12px' : '20px' }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                  }}>
                    <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Key Moments
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      marginLeft: 'auto',
                    }}>
                      {Math.min(analysis.report.timestamped_clips.length, 5)} moments
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analysis.report.timestamped_clips.slice(0, 5).map((clip, idx) => (
                      <motion.div
                        key={idx}
                        onClick={() => handleKeyMomentClick(clip)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        transition={{ delay: idx * 0.03 }}
                        style={{
                          display: 'flex',
                          gap: '14px',
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderLeft: `3px solid ${
                            clip.priority === 1 ? '#22c55e' :
                            clip.priority === 2 ? '#3b82f6' : 'rgba(255,255,255,0.1)'
                          }`,
                        }}
                      >
                        <div style={{
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          color: 'var(--accent-primary)',
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          minWidth: '55px',
                          textAlign: 'center',
                          fontWeight: 500,
                        }}>
                          {formatTime(clip.t0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            margin: 0,
                          }}>
                            {clip.label}
                          </p>
                          {clip.coaching_note && (
                            <p style={{
                              fontSize: '13px',
                              color: 'var(--text-muted)',
                              marginTop: '4px',
                              lineHeight: 1.5,
                            }}>
                              {clip.coaching_note}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
              </div>{/* End analysis-content wrapper */}

              {/* Error Display */}
              {analysis.error && !analysis.isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card"
                  style={{
                    padding: '16px',
                    marginBottom: '20px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <p style={{ color: 'var(--error)', fontSize: '14px', margin: 0 }}>
                    {analysis.error}
                  </p>
                  <motion.button
                    onClick={handleReset}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      marginTop: '12px',
                      background: 'transparent',
                      border: '1px solid var(--error)',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      color: 'var(--error)',
                      cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </motion.button>
                </motion.div>
              )}

              {/* === STUDY FOCUS CHIPS (auto-prompts chat) === */}
              {analysis.report && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="glass-card"
                  style={{
                    padding: isMobile ? '12px 14px' : '14px 18px',
                    marginBottom: isMobile ? '12px' : '12px',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px',
                  }}>
                    <Target size={14} style={{ color: '#8b5cf6' }} />
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Study Focus — tap to ask
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}>
                    {['Footwork', 'Head Movement', 'Combinations', 'Defense', 'Cage Control', 'Clinch Work'].map((focus) => (
                      <motion.button
                        key={focus}
                        onClick={() => {
                          setPendingChatMessage(`Analyze the ${focus.toLowerCase()} in this fight`);
                          if (isMobile) {
                            setShowMobileChat(true);
                          } else {
                            setIsChatExpanded(true);
                          }
                        }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: '20px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#8b5cf6',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {focus}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === 4. ACTION BUTTONS (Mobile) or CHAT BUTTON (Desktop) === */}
              {isMobile ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '8px',
                  }}
                >
                  {/* Export PDF Button - Only when report is ready */}
                  {analysis.report && (
                  <motion.button
                    onClick={async () => {
                      const html2pdf = (await import('html2pdf.js')).default;
                      const analysisEl = document.getElementById('analysis-content');
                      const chatEl = document.getElementById('mobile-chat-content');

                      // Create a combined container for PDF
                      const pdfContainer = document.createElement('div');
                      pdfContainer.style.background = '#1a1a2e';
                      pdfContainer.style.color = '#ffffff';
                      pdfContainer.style.padding = '20px';

                      if (analysisEl) {
                        const analysisClone = analysisEl.cloneNode(true) as HTMLElement;
                        pdfContainer.appendChild(analysisClone);
                      }

                      if (chatEl) {
                        const chatHeader = document.createElement('h2');
                        chatHeader.textContent = 'Chat Thread';
                        chatHeader.style.marginTop = '30px';
                        chatHeader.style.marginBottom = '15px';
                        chatHeader.style.color = '#3b82f6';
                        chatHeader.style.borderTop = '1px solid #333';
                        chatHeader.style.paddingTop = '20px';
                        pdfContainer.appendChild(chatHeader);

                        const chatClone = chatEl.cloneNode(true) as HTMLElement;
                        chatClone.style.height = 'auto';
                        chatClone.style.maxHeight = 'none';
                        chatClone.style.overflow = 'visible';
                        pdfContainer.appendChild(chatClone);
                      }

                      document.body.appendChild(pdfContainer);

                      html2pdf()
                        .set({
                          margin: 10,
                          filename: 'fight-analysis.pdf',
                          image: { type: 'jpeg', quality: 0.98 },
                          html2canvas: { scale: 2, backgroundColor: '#1a1a2e' },
                          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        })
                        .from(pdfContainer)
                        .save()
                        .then(() => {
                          document.body.removeChild(pdfContainer);
                        });
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: 'transparent',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Download size={18} />
                    Export Analysis (PDF)
                  </motion.button>
                  )}

                  {/* Let's Get Meta Button */}
                  <motion.button
                    onClick={() => setShowMobileChat(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: 'var(--accent-gradient)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    <MessageSquare size={20} />
                    Let&apos;s Get Meta
                  </motion.button>
                </motion.div>
              ) : (
                /* Desktop: Chat Button + PDF Export */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '8px',
                  }}
                >
                  {/* Let's Get Meta Button (Desktop) */}
                  <motion.button
                    onClick={() => setIsChatExpanded(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      flex: 1,
                      padding: '16px 20px',
                      background: 'var(--accent-gradient)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    <MessageSquare size={20} />
                    Let&apos;s Get Meta
                  </motion.button>

                  {/* Desktop PDF Export Button */}
                  {analysis.report && (
                    <motion.button
                      onClick={async () => {
                        const html2pdf = (await import('html2pdf.js')).default;
                        const analysisEl = document.getElementById('analysis-content');
                        const chatEl = document.getElementById('expanded-chat-content');

                        const pdfContainer = document.createElement('div');
                        pdfContainer.style.background = '#1a1a2e';
                        pdfContainer.style.color = '#ffffff';
                        pdfContainer.style.padding = '20px';

                        if (analysisEl) {
                          const analysisClone = analysisEl.cloneNode(true) as HTMLElement;
                          pdfContainer.appendChild(analysisClone);
                        }

                        if (chatEl) {
                          const chatHeader = document.createElement('h2');
                          chatHeader.textContent = 'Chat Thread';
                          chatHeader.style.marginTop = '30px';
                          chatHeader.style.marginBottom = '15px';
                          chatHeader.style.color = '#3b82f6';
                          chatHeader.style.borderTop = '1px solid #333';
                          chatHeader.style.paddingTop = '20px';
                          pdfContainer.appendChild(chatHeader);

                          const chatClone = chatEl.cloneNode(true) as HTMLElement;
                          chatClone.style.height = 'auto';
                          chatClone.style.maxHeight = 'none';
                          chatClone.style.overflow = 'visible';
                          pdfContainer.appendChild(chatClone);
                        }

                        document.body.appendChild(pdfContainer);

                        html2pdf()
                          .set({
                            margin: 10,
                            filename: 'fight-analysis.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, backgroundColor: '#1a1a2e' },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                          })
                          .from(pdfContainer)
                          .save()
                          .then(() => {
                            document.body.removeChild(pdfContainer);
                          });
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '16px 20px',
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Download size={18} />
                      Export PDF
                    </motion.button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === MOBILE CHAT PANEL (Below Video - Partial Height) === */}
        <AnimatePresence>
          {showMobileChat && isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: videoBottom,
                left: 0,
                right: 0,
                height: `calc(100vh - ${videoBottom}px - 20px)`,
                maxHeight: '55vh',
                background: 'var(--bg-primary)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                borderTop: '2px solid var(--accent-primary)',
                borderRadius: '20px 20px 0 0',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <MessageSquare size={16} style={{ color: 'var(--accent-primary)' }} />
                  Fight Chat
                </span>
                <motion.button
                  onClick={() => setShowMobileChat(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <X size={16} />
                  Close
                </motion.button>
              </div>

              {/* Chat Panel */}
              <div id="mobile-chat-content" style={{
                flex: 1,
                overflow: 'hidden',
              }}>
                <ChatPanel
                  analysisId={analysis.analysisId}
                  pendingMessage={pendingChatMessage || undefined}
                  onMessageSent={() => setPendingChatMessage(null)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === DESKTOP EXPANDED CHAT PANEL (Full width, below video) === */}
        <AnimatePresence>
          {isChatExpanded && !isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: videoBottom,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'var(--bg-primary)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                borderTop: '2px solid var(--accent-primary)',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '12px 24px',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <MessageSquare size={20} style={{ color: 'var(--accent-primary)' }} />
                  Fight Chat
                </span>
                <motion.button
                  onClick={() => setIsChatExpanded(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  <Minimize2 size={18} />
                  Collapse
                </motion.button>
              </div>

              {/* Chat Panel - Full Width */}
              <div id="expanded-chat-content" style={{
                flex: 1,
                overflow: 'hidden',
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto',
                padding: '0 24px',
              }}>
                <ChatPanel
                  analysisId={analysis.analysisId}
                  pendingMessage={pendingChatMessage || undefined}
                  onMessageSent={() => setPendingChatMessage(null)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer - Hidden on mobile */}
        {!isMobile && (
          <footer style={{
            textAlign: 'center',
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid var(--glass-border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
          }}>
            The Fight Analyst v0.5.0
          </footer>
        )}
      </div>

      {/* === WELCOME POPUP FOR TESTERS === */}
      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: 'linear-gradient(145deg, rgba(30, 30, 50, 0.98), rgba(20, 20, 35, 0.98))',
                borderRadius: '20px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: isMobile ? '24px 20px' : '32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.15)',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{
                  background: 'var(--accent-gradient)',
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Zap size={24} style={{ color: 'white' }} />
                </div>
                <div>
                  <h2 style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-primary)',
                  }}>
                    Welcome, Tester!
                  </h2>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--accent-primary)',
                    margin: 0,
                    fontWeight: 500,
                  }}>
                    Fight Analyst Beta
                  </p>
                </div>
              </div>

              {/* Content */}
              <div style={{
                fontSize: '14px',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>The Fight Analyst</strong> uses AI to break down fight videos,
                  providing tactical insights, key moments, and coaching analysis.
                </p>

                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderLeft: '3px solid var(--accent-primary)',
                  padding: '12px 16px',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: '16px',
                }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>Pro Tip:</strong> For best results, use
                  <strong style={{ color: 'var(--text-primary)' }}> full fight videos from YouTube</strong>.
                  Highlights and clips work, but complete fights give deeper analysis.
                </div>

                <p style={{ marginBottom: '16px' }}>
                  <span style={{ color: '#8b5cf6' }}>Coming Soon:</span> We&apos;re expanding to
                  <strong style={{ color: 'var(--text-primary)' }}> motion capture capabilities</strong> for
                  even more detailed technique breakdowns.
                </p>

                <p style={{ marginBottom: '16px' }}>
                  After your analysis, use the <strong style={{ color: 'var(--text-primary)' }}>Export PDF</strong> button
                  to save your analysis and chat thread.
                </p>

                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderLeft: '3px solid #ef4444',
                  padding: '12px 16px',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: '20px',
                }}>
                  <strong style={{ color: '#ef4444' }}>Found a bug?</strong> Take a screenshot and text it to Pete:
                  <br />
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                  }}>
                    727-400-2225
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                onClick={handleCloseWelcome}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'var(--accent-gradient)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Let&apos;s Get It On!!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </main>
  );
}
