/**
 * API client for FightTapeAnalyst backend.
 * Provides type-safe methods for all API endpoints.
 */

import type {
  VideoUploadResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisStatusResponse,
  ChatRequest,
  ChatResponse,
} from './types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Custom error class for API errors.
 */
export class APIError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'APIError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Make a request to the API with error handling.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}/api${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let detail = 'Unknown error';
      try {
        const errorData = await response.json();
        detail = errorData.detail || JSON.stringify(errorData);
      } catch {
        detail = await response.text() || `HTTP ${response.status}`;
      }
      throw new APIError(response.status, detail);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // Network or other errors
    throw new APIError(0, `Network error: ${(error as Error).message}`);
  }
}

/**
 * Upload a video file.
 */
export async function uploadVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<VideoUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${BACKEND_URL}/api/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new APIError(xhr.status, 'Invalid JSON response'));
        }
      } else {
        let detail = 'Upload failed';
        try {
          const errorData = JSON.parse(xhr.responseText);
          detail = errorData.detail || detail;
        } catch {
          detail = xhr.responseText || detail;
        }
        reject(new APIError(xhr.status, detail));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new APIError(0, 'Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new APIError(0, 'Upload cancelled'));
    });

    xhr.open('POST', url);
    xhr.send(formData);
  });
}

/**
 * Start a fight analysis.
 */
export async function startAnalysis(
  request: AnalyzeRequest
): Promise<AnalyzeResponse> {
  return apiRequest<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get analysis status and results.
 */
export async function getAnalysisStatus(
  analysisId: string
): Promise<AnalysisStatusResponse> {
  return apiRequest<AnalysisStatusResponse>(`/analysis/${analysisId}`);
}

/**
 * Poll analysis status until completion.
 */
export async function pollAnalysisStatus(
  analysisId: string,
  onUpdate: (status: AnalysisStatusResponse) => void,
  intervalMs: number = 2000,
  maxAttempts: number = 300 // 10 minutes max
): Promise<AnalysisStatusResponse> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getAnalysisStatus(analysisId);
        onUpdate(status);

        if (status.status === 'completed' || status.status === 'failed') {
          resolve(status);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          reject(new APIError(408, 'Analysis timeout'));
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

/**
 * Send a chat message.
 */
export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Check API health.
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  return apiRequest<{ status: string; version: string }>('/health');
}

/**
 * Format timestamp for display (MM:SS.s)
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Format timestamp range for clipboard (MM:SS.s - MM:SS.s)
 */
export function formatTimestampRange(t0: number, t1: number): string {
  return `${formatTimestamp(t0)} - ${formatTimestamp(t1)}`;
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
