'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage, generateSessionId, APIError } from '../lib/apiClient';
import type { ChatMessage, ChatState } from '../lib/types';
import Timeline from './Timeline';
import VoiceToggle from './VoiceToggle';
import VoiceChat from './VoiceChat';

interface ChatPanelProps {
  analysisId?: string;
  pendingMessage?: string;
  onMessageSent?: () => void;
}

export default function ChatPanel({ analysisId, pendingMessage, onMessageSent }: ChatPanelProps) {
  const [state, setState] = useState<ChatState>({
    sessionId: '',
    messages: [],
    isLoading: false,
  });
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [voiceConnected, setVoiceConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      sessionId: generateSessionId(),
    }));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Core send logic - takes message text directly
  const sendMessageDirect = useCallback(async (message: string) => {
    if (!message || state.isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: undefined,
    }));

    try {
      const response = await sendChatMessage({
        session_id: state.sessionId,
        analysis_id: analysisId,
        message,
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        clips: response.suggested_clips,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof APIError
        ? error.detail
        : 'Failed to send message. Please try again.';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [state.sessionId, state.isLoading, analysisId]);

  // Wrapper for input-based sending
  const sendMessage = useCallback(async () => {
    const message = input.trim();
    if (!message) return;
    setInput('');
    await sendMessageDirect(message);
  }, [input, sendMessageDirect]);

  // Auto-send when pendingMessage changes (for Key Moments clicks)
  useEffect(() => {
    if (pendingMessage && !state.isLoading && state.sessionId) {
      sendMessageDirect(pendingMessage);
      onMessageSent?.();
    }
  }, [pendingMessage, state.isLoading, state.sessionId, sendMessageDirect, onMessageSent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="glass-card noise-overlay"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header - Compact */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--glass-border)',
          fontWeight: 600,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--accent-gradient)',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
        }} />
        <span>FightAnalyst</span>
        {analysisId && (
          <span style={{
            color: 'var(--text-muted)',
            fontWeight: 400,
            fontSize: '11px',
          }}>
            • Ready
          </span>
        )}
      </div>

      {/* Voice Mode */}
      {voiceMode ? (
        <VoiceChat
          sessionId={state.sessionId}
          analysisId={analysisId}
          onTranscript={(text, role) => {
            // Add voice transcripts to message history
            const message: ChatMessage = {
              id: `voice_${Date.now()}`,
              role: role === 'user' ? 'user' : 'assistant',
              content: text,
              timestamp: new Date(),
            };
            setState(prev => ({
              ...prev,
              messages: [...prev.messages, message],
            }));
          }}
        />
      ) : (
      <>
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {state.messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginTop: '60px',
            }}
          >
            <motion.div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </motion.div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              Let&apos;s Get Meta
            </div>
            <div style={{ fontSize: '14px' }}>
              Dive deeper into technique, strategy, and what separates elite fighters
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {state.messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <motion.div
                  style={{
                    maxWidth: '85%',
                    padding: '14px 18px',
                    borderRadius: msg.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'var(--accent-gradient)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: msg.role === 'user'
                      ? 'none'
                      : '1px solid var(--glass-border)',
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                  {msg.clips && msg.clips.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ marginTop: '14px' }}
                    >
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        marginBottom: '10px',
                        fontWeight: 500,
                      }}>
                        Suggested clips:
                      </div>
                      <Timeline clips={msg.clips} compact />
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        <AnimatePresence>
          {state.isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <motion.div
                  style={{ display: 'flex', gap: '6px' }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-primary)',
                      }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
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
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--error)',
                marginBottom: '16px',
                fontSize: '14px',
              }}
            >
              {state.error}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--glass-border)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the fight..."
            disabled={state.isLoading}
            className="input-glass"
            style={{
              flex: 1,
              resize: 'none',
              minHeight: '44px',
              maxHeight: '100px',
              fontFamily: 'inherit',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
            rows={1}
          />
          {/* Voice Toggle - Next to send */}
          <VoiceToggle
            isEnabled={voiceMode}
            onToggle={() => setVoiceMode(!voiceMode)}
            isConnected={voiceConnected}
          />
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || state.isLoading}
            className="btn-primary"
            style={{
              padding: '10px 16px',
              opacity: input.trim() && !state.isLoading ? 1 : 0.5,
              cursor: input.trim() && !state.isLoading ? 'pointer' : 'not-allowed',
            }}
            whileHover={input.trim() && !state.isLoading ? { scale: 1.02 } : {}}
            whileTap={input.trim() && !state.isLoading ? { scale: 0.98 } : {}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </motion.button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
