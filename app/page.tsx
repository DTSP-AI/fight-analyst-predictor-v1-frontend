'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronDown, MessageSquare, Loader2, Clock, Swords } from 'lucide-react';
import YouTubeInput from './components/YouTubeInput';
import YouTubePlayer from './components/YouTubePlayer';
import ChatPanel from './components/ChatPanel';
import HamburgerMenu from './components/HamburgerMenu';
import Sidebar from './components/Sidebar';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);

  // Handler for Key Moment clicks - auto-prompts chat
  const handleKeyMomentClick = useCallback((clip: TimestampedClip) => {
    const time = `${Math.floor(clip.t0 / 60)}:${String(Math.floor(clip.t0 % 60)).padStart(2, '0')}`;
    setPendingChatMessage(`Break down what happened at ${time}: "${clip.label}"`);
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

        {/* Header - Compact on mobile with hamburger */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'space-between' : 'center',
          marginBottom: isMobile ? '12px' : '32px',
          textAlign: isMobile ? 'left' : 'center',
          flexDirection: isMobile ? 'row' : 'column',
        }}>
          <div>
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
          </div>
          {/* Hamburger in header on mobile */}
          {isMobile && analysis.report && (
            <HamburgerMenu
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
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
              <div style={{
                marginBottom: isMobile ? '8px' : '20px',
                width: '100%',
              }}>
                <YouTubePlayer url={youtubeUrl} />
              </div>

              {/* Mobile Menu Hint - Shows when analysis is ready */}
              {isMobile && analysis.report && !sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    marginBottom: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSidebarOpen(true)}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-primary)' }}>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--accent-primary)',
                    fontWeight: 500,
                  }}>
                    Tap for breakdown & key moments
                  </span>
                </motion.div>
              )}

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

              {/* Mobile Sidebar - Contains analysis content on mobile */}
              {isMobile && analysis.report && (
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
                  {/* Fighter Cards */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
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
                  </div>

                  {/* The Breakdown */}
                  <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                    }}>
                      <Swords size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        The Breakdown
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                      margin: 0,
                    }}>
                      {analysis.report.summary}
                    </p>
                    {analysis.report.coaching_insights && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(139, 92, 246, 0.06)',
                        borderRadius: '6px',
                        borderLeft: '3px solid #8b5cf6',
                      }}>
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          margin: 0,
                          fontStyle: 'italic',
                        }}>
                          {analysis.report.coaching_insights}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Key Moments */}
                  {analysis.report.timestamped_clips && analysis.report.timestamped_clips.length > 0 && (
                    <div className="glass-card" style={{ padding: '16px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '12px',
                      }}>
                        <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          Key Moments
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analysis.report.timestamped_clips.slice(0, 5).map((clip, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleKeyMomentClick(clip)}
                            style={{
                              display: 'flex',
                              gap: '10px',
                              padding: '10px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                          >
                            <span style={{
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              color: 'var(--accent-primary)',
                              background: 'rgba(59, 130, 246, 0.1)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              minWidth: '50px',
                              textAlign: 'center',
                            }}>
                              {Math.floor(clip.t0 / 60)}:{String(Math.floor(clip.t0 % 60)).padStart(2, '0')}
                            </span>
                            <span style={{
                              fontSize: '13px',
                              color: 'var(--text-primary)',
                              flex: 1,
                            }}>
                              {clip.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Sidebar>
              )}

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


              {/* === 1. FIGHTER CARDS (Expandable) - Desktop Only === */}
              {!isMobile && analysis.report && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '20px',
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

              {/* === 2. FIGHT ANALYSIS - Desktop Only === */}
              {!isMobile && analysis.report && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card"
                  style={{ padding: '20px', marginBottom: '20px' }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Swords size={18} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{
                        fontSize: '15px',
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
                    fontSize: '15px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {analysis.report.summary}
                  </p>

                  {/* Coaching Insights inline */}
                  {analysis.report.coaching_insights && (
                    <div style={{
                      marginTop: '16px',
                      padding: '14px',
                      background: 'rgba(139, 92, 246, 0.06)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #8b5cf6',
                    }}>
                      <p style={{
                        fontSize: '14px',
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

              {/* === 3. KEY MOMENTS (max 5) - Desktop Only === */}
              {!isMobile && analysis.report?.timestamped_clips && analysis.report.timestamped_clips.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass-card"
                  style={{ padding: '20px', marginBottom: '20px' }}
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

              {/* === 4. CHAT SECTION - Full width on mobile === */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ width: '100%' }}
              >
                {/* Hide label on mobile for more space */}
                {!isMobile && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px',
                  }}>
                    <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Ask About the Fight
                    </span>
                  </div>
                )}
                <div style={{
                  height: isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 200px)',
                  minHeight: isMobile ? '300px' : '400px',
                  maxHeight: isMobile ? 'none' : '800px',
                  width: '100%',
                }}>
                  <ChatPanel
                    analysisId={analysis.analysisId}
                    pendingMessage={pendingChatMessage || undefined}
                    onMessageSent={() => setPendingChatMessage(null)}
                  />
                </div>
              </motion.div>
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
