/**
 * TypeScript mirrors of backend Pydantic contracts.
 *
 * Source of truth: backend/app/models/predictor_contracts.py
 *                  backend/app/models/stat_contracts.py
 *
 * Keep these in lockstep with the backend models — wire format is JSON,
 * field names must match the Pydantic field names exactly.
 */

// ============================================================================
// Enums (literal unions match Pydantic str enums)
// ============================================================================

export type AllowedModel =
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5'
  | 'gpt-4o'
  | 'gpt-4o-mini';

export type Sport = 'mma' | 'boxing' | 'kickboxing' | 'muay_thai';

export type Method =
  | 'KO'
  | 'TKO'
  | 'SUB'
  | 'DEC-U'
  | 'DEC-S'
  | 'DEC-M'
  | 'NC'
  | 'UNKNOWN';

// Kept for legacy frontend imports; backend AthleteProfile no longer carries
// style classification after the Phase 1 strip.
export type PrimaryStyle =
  | 'striker'
  | 'wrestler'
  | 'grappler'
  | 'hybrid'
  | 'unknown';

export type PipelineStatus =
  | 'pending'
  | 'analyzing_fights'
  | 'fetching_camp_intel'
  | 'aggregating_profiles'
  | 'building_features'
  | 'predicting'
  | 'persisting'
  | 'completed'
  | 'failed';

// ============================================================================
// Athlete profile (deterministic rollup)
// ============================================================================

export interface AthleteProfile {
  canonical_name: string;
  display_name: string;
  sport: Sport;
  fights_analyzed: number;

  wins: number;
  losses: number;
  draws_or_nc: number;
  finish_rate: number;
  method_breakdown: Record<string, number>;

  // Career averages from structured sources (ufcstats et al.). Keys mirror
  // backend: sig_strikes_landed_per_min, sig_strike_accuracy_pct,
  // sig_strikes_absorbed_per_min, sig_strike_defense_pct,
  // takedown_avg_per_15min, takedown_accuracy_pct,
  // takedown_defense_pct, submission_avg_per_15min
  career_stats: Record<string, number>;

  source_fight_urls: string[];
  verified_fight_count: number;
  profile_built_at: string; // ISO datetime
}

// ============================================================================
// Camp intel (LLM-fetched)
// ============================================================================

export interface CampIntelSource {
  url: string;
  claim: string;
}

export interface CampIntel {
  athlete_name: string;
  camp_name: string | null;
  head_coach: string | null;
  coach_changes: string | null;
  injury_notes: string | null;
  weight_class_notes: string | null;
  layoff_days: number | null;
  last_fight_summary: string | null;
  recent_trends: string | null;
  raw_summary: string;
  sources: CampIntelSource[];
  blocked_terms_detected: string[];
  fetched_at: string;
}

// ============================================================================
// Matchup features (deterministic deltas)
// ============================================================================

export interface CommonOpponentResult {
  opponent_canonical_name: string;
  opponent_display_name: string;
  a_result: 'W' | 'L' | 'D' | 'NC' | null;
  b_result: 'W' | 'L' | 'D' | 'NC' | null;
  notes: string | null;
}

export interface MatchupFeatures {
  fighter_a_name: string;
  fighter_b_name: string;
  sport: Sport;

  reach_diff_in: number | null;
  age_diff_yrs: number | null;
  layoff_diff_days: number | null;

  common_opponents: CommonOpponentResult[];
}

// ============================================================================
// Stat prediction (optional anchor on PredictionReport)
// ============================================================================

export interface ShapContribution {
  feature: string;
  value: number;
  contribution: number;
}

export interface StatPrediction {
  p_fighter_a: number;
  p_fighter_b: number;
  confidence_band: [number, number];
  top_contributors: ShapContribution[];
  method: 'heuristic' | 'xgboost_calibrated';
  model_version: string | null;
  feature_vector_id: string | null;
}

// ============================================================================
// Prediction report (LLM output)
// ============================================================================

export interface PredictionReport {
  predicted_winner: string;
  confidence: number;
  method_likelihood: Record<string, number>;
  round_likelihood: Record<string, number>;
  reasoning_paragraphs: string[];
  a_paths_to_victory: string[];
  b_paths_to_victory: string[];
  a_signature_dangers: string[];
  b_signature_dangers: string[];
  x_factors: string[];
  grounded_in_fights: string[];
  honest_take: string;

  forbidden_terms_check_passed: boolean;
  forbidden_terms_found: string[];

  model_used: AllowedModel;
  generated_at: string;

  stat_prediction: StatPrediction | null;
}

// ============================================================================
// Request / response shapes
// ============================================================================

export interface FighterInput {
  name: string;
  fight_urls: string[];
}

export interface PredictRequest {
  fighter_a: FighterInput;
  fighter_b: FighterInput;
  sport: Sport;
  model: AllowedModel;
}

export interface PredictAcceptedResponse {
  prediction_id: string;
  status: 'pending';
  message: string;
}

export interface PredictionStatusResponse {
  prediction_id: string;
  pipeline_status: PipelineStatus;
  progress_pct: number;
  current_step: string | null;
  error_message: string | null;

  fighter_a_name: string;
  fighter_b_name: string;
  model_used: AllowedModel;
  sport: Sport;

  fighter_a_profile: AthleteProfile | null;
  fighter_b_profile: AthleteProfile | null;
  fighter_a_camp_intel: CampIntel | null;
  fighter_b_camp_intel: CampIntel | null;
  matchup_features: MatchupFeatures | null;
  prediction_report: PredictionReport | null;

  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// KG read-side
// ============================================================================

export interface AthleteSummary {
  id: string;
  name: string;
  canonical_name: string;
  sport: Sport;
  nickname: string | null;
  profile: AthleteProfile | null;
  profile_updated_at: string | null;
  fights_in_kg: number;
}

export interface FightSummary {
  id: string;
  youtube_url: string;
  event_name: string | null;
  event_date: string | null;
  sport: Sport;
  verified: boolean;
  won: boolean | null;
  method: string | null;
  round_finished: number | null;
  matchup_number: number | null;
}

// ============================================================================
// UI-side state (not from backend)
// ============================================================================

export interface PredictionState {
  isRunning: boolean;
  predictionId?: string;
  status: PipelineStatus;
  progress: number;
  currentStep?: string;
  error?: string;
  result?: PredictionStatusResponse;
}

export const ALLOWED_MODELS: ReadonlyArray<{ id: AllowedModel; label: string }> = [
  { id: 'gpt-4o', label: 'GPT-4o (default)' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
];

export const SPORTS: ReadonlyArray<{ id: Sport; label: string }> = [
  { id: 'mma', label: 'MMA' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'kickboxing', label: 'Kickboxing' },
  { id: 'muay_thai', label: 'Muay Thai' },
];

// ============================================================================
// Fight search (drives the new search-primary /predict input UX)
// Mirrors backend/app/models/fight_search.py
// ============================================================================

export interface RecentFight {
  date: string | null;
  opponent: string;
  event: string | null;
  weight_class: string | null;
  result_summary: string | null;
}

export interface FightCandidate {
  youtube_url: string;
  title: string;
  channel: string;
  is_full_fight: boolean;
  llm_confidence: number;
  validated: boolean;
  duration_sec: number | null;
}

export interface FighterFightHistorySlot {
  fight: RecentFight;
  candidates: FightCandidate[];
}

export interface FighterSearchResult {
  fighter_name: string;
  sport: Sport;
  limit: number;
  slots: FighterFightHistorySlot[];
  cached: boolean;
  fetched_at: string;
  notes: string[];
  /** True when the upstream search provider errored — render as
   *  "search unavailable", never as "no fights found". */
  search_failed?: boolean;
}
