/**
 * Predictor API client.
 *
 * Talks to:
 *   POST /api/predict                          -> kick off prediction
 *   GET  /api/prediction/{id}                  -> poll status / final report
 *   GET  /api/athletes/{canonical}/profile     -> KG-backed profile
 *   GET  /api/athletes/{canonical}/fights      -> athlete fight history
 *   GET  /api/predictor/health                 -> liveness probe
 *
 * Mirrors the error pattern from app/lib/apiClient.ts (APIError class).
 * Kept as a separate module so the legacy YouTube-analyst client stays
 * untouched.
 */

import type {
  FighterSearchResult,
  PipelineStatus,
  PredictAcceptedResponse,
  PredictionStatusResponse,
  PredictRequest,
  Sport,
} from './predictorTypes';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export class PredictorAPIError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'PredictorAPIError';
    this.status = status;
    this.detail = detail;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}/api${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (err) {
    throw new PredictorAPIError(0, `Network error: ${(err as Error).message}`);
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      try {
        detail = (await response.text()) || detail;
      } catch {
        // keep default
      }
    }
    throw new PredictorAPIError(response.status, detail);
  }

  return (await response.json()) as T;
}

// ----------------------------------------------------------------------------
// Predict pipeline
// ----------------------------------------------------------------------------

export async function startPrediction(
  request: PredictRequest
): Promise<PredictAcceptedResponse> {
  return apiRequest<PredictAcceptedResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getPredictionStatus(
  predictionId: string
): Promise<PredictionStatusResponse> {
  return apiRequest<PredictionStatusResponse>(`/prediction/${predictionId}`);
}

const TERMINAL_STATUSES: ReadonlyArray<PipelineStatus> = ['completed', 'failed'];

/**
 * Poll prediction status until it reaches a terminal state.
 * Calls onUpdate on every tick so the UI can render progress.
 */
export async function pollPredictionStatus(
  predictionId: string,
  onUpdate: (status: PredictionStatusResponse) => void,
  intervalMs: number = 3000,
  maxAttempts: number = 600 // 30 min cap at 3s interval
): Promise<PredictionStatusResponse> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const status = await getPredictionStatus(predictionId);
        onUpdate(status);

        if (TERMINAL_STATUSES.includes(status.pipeline_status)) {
          resolve(status);
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(new PredictorAPIError(408, 'Prediction polling timed out'));
          return;
        }

        setTimeout(tick, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    tick();
  });
}

// ----------------------------------------------------------------------------
// KG read-side
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Fighter fight-history search
// ----------------------------------------------------------------------------

export async function searchFighterFights(params: {
  name: string;
  sport?: Sport;
  limit?: number;
  refresh?: boolean;
}): Promise<FighterSearchResult> {
  const q = new URLSearchParams({
    name: params.name,
    sport: params.sport ?? 'mma',
    limit: String(params.limit ?? 5),
  });
  if (params.refresh) q.set('refresh', 'true');
  return apiRequest<FighterSearchResult>(`/search/fighter-fights?${q.toString()}`);
}

// ----------------------------------------------------------------------------
// Utility — canonicalize a display name the same way the backend does.
// Mirrors backend services/metrics_extractor.py::canonicalize_name:
//   lowercase → strip "quoted nicknames" → strip (paren nicknames) → strip
//   diacritics → collapse whitespace. Output keeps spaces (matches backend).
// If the backend rule ever changes, update both at once.
// ----------------------------------------------------------------------------

export function canonicalizeName(name: string): string {
  if (!name) return '';
  let s = name.trim().toLowerCase();
  s = s.replace(/['"]([^'"]+)['"]/g, ''); // 'Conor "The Notorious" McGregor'
  s = s.replace(/\(([^)]+)\)/g, '');       // 'Khabib (The Eagle) Nurmagomedov'
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); // strip diacritics
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
