/**
 * Audio utilities for OpenAI Realtime API integration.
 * Handles microphone capture, audio playback, and PCM16 encoding.
 */

// Audio configuration matching OpenAI Realtime API requirements
export const AUDIO_CONFIG = {
  sampleRate: 24000, // OpenAI uses 24kHz
  channelCount: 1,   // Mono
  bitsPerSample: 16, // PCM16
} as const;

/**
 * Encode Float32Array audio data to base64 PCM16.
 */
export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

/**
 * Convert ArrayBuffer to base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert PCM16 ArrayBuffer to Float32Array for audio playback.
 */
export function pcm16ToFloat32(pcm16Buffer: ArrayBuffer): Float32Array {
  const view = new DataView(pcm16Buffer);
  const float32Array = new Float32Array(pcm16Buffer.byteLength / 2);

  for (let i = 0; i < float32Array.length; i++) {
    const int16 = view.getInt16(i * 2, true);
    float32Array[i] = int16 / 0x8000;
  }

  return float32Array;
}

/**
 * Audio recorder class for capturing microphone input.
 */
export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  public onAudioData: ((base64Audio: string) => void) | null = null;

  async start(): Promise<boolean> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.sampleRate,
          channelCount: AUDIO_CONFIG.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: AUDIO_CONFIG.sampleRate,
      });

      // Create source from microphone
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Use ScriptProcessor for now (AudioWorklet requires more setup)
      const bufferSize = 4096;
      const scriptProcessor = this.audioContext.createScriptProcessor(
        bufferSize,
        AUDIO_CONFIG.channelCount,
        AUDIO_CONFIG.channelCount
      );

      scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        if (this.onAudioData) {
          this.onAudioData(base64Audio);
        }
      };

      this.source.connect(scriptProcessor);
      scriptProcessor.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      return false;
    }
  }

  stop(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.source = null;
    this.workletNode = null;
  }
}

/**
 * Audio player class for playing back audio from Realtime API.
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext({
      sampleRate: AUDIO_CONFIG.sampleRate,
    });
  }

  /**
   * Add base64 PCM16 audio to playback queue.
   */
  addAudio(base64Audio: string): void {
    if (!this.audioContext) return;

    const pcmBuffer = base64ToArrayBuffer(base64Audio);
    const float32Data = pcm16ToFloat32(pcmBuffer);

    const audioBuffer = this.audioContext.createBuffer(
      AUDIO_CONFIG.channelCount,
      float32Data.length,
      AUDIO_CONFIG.sampleRate
    );

    audioBuffer.getChannelData(0).set(float32Data);
    this.audioQueue.push(audioBuffer);

    if (!this.isPlaying) {
      this.playQueue();
    }
  }

  private playQueue(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextPlayTime);

    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    source.onended = () => {
      this.playQueue();
    };
  }

  stop(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Get audio level from audio data (for visualization).
 */
export function getAudioLevel(float32Array: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < float32Array.length; i++) {
    sum += Math.abs(float32Array[i]);
  }
  return sum / float32Array.length;
}
