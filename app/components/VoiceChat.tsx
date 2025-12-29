'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, Radio, Loader2 } from 'lucide-react';
import { AudioRecorder, AudioPlayer } from '../lib/audioUtils';

interface VoiceChatProps {
  sessionId: string;
  analysisId?: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onClose?: () => void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface Transcript {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isPartial?: boolean;
}

export default function VoiceChat({
  sessionId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  analysisId,
  onTranscript,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose,
}: VoiceChatProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState('connecting');
    setError(null);

    try {
      // Get backend URL from environment or default
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const wsUrl = backendUrl.replace('http', 'ws') + `/api/realtime/voice/${sessionId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEvent(data);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
        setConnectionState('error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setConnectionState('disconnected');
        stopRecording();
      };

    } catch (e) {
      console.error('Failed to connect:', e);
      setError('Failed to connect to voice service');
      setConnectionState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Handle server events
  const handleServerEvent = useCallback((event: Record<string, unknown>) => {
    const type = event.type as string;

    switch (type) {
      case 'session.ready':
        setConnectionState('connected');
        startRecording();
        break;

      case 'session.created':
      case 'session.updated':
        // Session configured
        break;

      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        const userTranscript = (event.transcript as string) || '';
        if (userTranscript.trim()) {
          addTranscript('user', userTranscript);
          onTranscript?.(userTranscript, 'user');
        }
        break;

      case 'response.audio_transcript.delta':
        // Partial assistant transcript
        const delta = (event.delta as string) || '';
        updatePartialTranscript('assistant', delta);
        break;

      case 'response.audio_transcript.done':
        // Complete assistant transcript
        const fullTranscript = (event.transcript as string) || '';
        finalizeTranscript('assistant', fullTranscript);
        onTranscript?.(fullTranscript, 'assistant');
        break;

      case 'response.audio.delta':
        // Audio chunk from assistant
        const audio = (event.delta as string) || '';
        if (audio && playerRef.current) {
          setIsSpeaking(true);
          playerRef.current.addAudio(audio);
        }
        break;

      case 'response.audio.done':
        setIsSpeaking(false);
        break;

      case 'response.done':
        // Response complete
        break;

      case 'error':
        const errorMsg = ((event.error as Record<string, unknown>)?.message as string) || 'Unknown error';
        setError(errorMsg);
        console.error('Realtime API error:', event.error);
        break;

      default:
        // Unhandled event
        break;
    }
  }, [onTranscript]);

  // Add a complete transcript
  const addTranscript = (role: 'user' | 'assistant', text: string) => {
    setTranscripts(prev => [
      ...prev.filter(t => !t.isPartial || t.role !== role),
      {
        id: `${role}_${Date.now()}`,
        role,
        text,
        timestamp: new Date(),
        isPartial: false,
      }
    ]);
  };

  // Update partial transcript (streaming)
  const updatePartialTranscript = (role: 'user' | 'assistant', delta: string) => {
    setTranscripts(prev => {
      const existing = prev.find(t => t.isPartial && t.role === role);
      if (existing) {
        return prev.map(t =>
          t.id === existing.id ? { ...t, text: t.text + delta } : t
        );
      }
      return [
        ...prev,
        {
          id: `${role}_${Date.now()}_partial`,
          role,
          text: delta,
          timestamp: new Date(),
          isPartial: true,
        }
      ];
    });
  };

  // Finalize partial transcript
  const finalizeTranscript = (role: 'user' | 'assistant', text: string) => {
    setTranscripts(prev => {
      const filtered = prev.filter(t => !t.isPartial || t.role !== role);
      return [
        ...filtered,
        {
          id: `${role}_${Date.now()}`,
          role,
          text,
          timestamp: new Date(),
          isPartial: false,
        }
      ];
    });
  };

  // Start recording
  const startRecording = async () => {
    if (recorderRef.current) return;

    const recorder = new AudioRecorder();
    recorder.onAudioData = (base64Audio) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio,
        }));
      }
    };

    const started = await recorder.start();
    if (started) {
      recorderRef.current = recorder;
      setIsListening(true);

      // Initialize audio player
      const player = new AudioPlayer();
      await player.initialize();
      playerRef.current = player;
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  // Disconnect
  const disconnect = useCallback(() => {
    stopRecording();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio
            size={16}
            style={{
              color: connectionState === 'connected' ? '#22c55e' : 'var(--text-muted)',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {connectionState === 'connected' ? 'Voice Active' : 'Connecting...'}
          </span>
        </div>

        {/* Status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Mic size={14} style={{ color: '#ef4444' }} />
              </motion.div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Listening
              </span>
            </motion.div>
          )}

          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                <Volume2 size={14} style={{ color: 'var(--accent-primary)' }} />
              </motion.div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Speaking
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Transcripts */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        <AnimatePresence initial={false}>
          {transcripts.map((transcript) => (
            <motion.div
              key={transcript.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: transcript.isPartial ? 0.7 : 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: transcript.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: transcript.role === 'user'
                    ? '12px 12px 4px 12px'
                    : '12px 12px 12px 4px',
                  background: transcript.role === 'user'
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                {transcript.text}
                {transcript.isPartial && (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ marginLeft: '2px' }}
                  >
                    |
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Connection status */}
        {connectionState === 'connecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px',
              color: 'var(--text-muted)',
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontSize: '13px' }}>Connecting to voice assistant...</span>
          </motion.div>
        )}

        {/* Empty state */}
        {connectionState === 'connected' && transcripts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-muted)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={20} style={{ color: 'var(--accent-primary)' }} />
            </motion.div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              Start speaking to ask about the fight
            </div>
            <div style={{ fontSize: '12px' }}>
              Voice detection is active
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--error)',
              fontSize: '13px',
              marginTop: '12px',
            }}
          >
            {error}
          </motion.div>
        )}

        <div ref={transcriptsEndRef} />
      </div>

      {/* Visual feedback bar */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        {/* Audio level visualization */}
        {connectionState === 'connected' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                style={{
                  width: '3px',
                  height: '12px',
                  borderRadius: '2px',
                  background: isListening || isSpeaking
                    ? 'var(--accent-primary)'
                    : 'var(--glass-border)',
                }}
                animate={
                  isListening || isSpeaking
                    ? { scaleY: [0.3, 1, 0.5, 0.8, 0.3] }
                    : { scaleY: 0.3 }
                }
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
