/**
 * TypeScript types for FightTapeAnalyst frontend.
 * Mirrors backend contracts for type safety.
 */

// ============================================================================
// Enums
// ============================================================================

export type AnalysisStatus =
  | 'pending'
  | 'extracting'
  | 'transcribing'
  | 'analyzing'
  | 'building_report'
  | 'completed'
  | 'failed';

export type Stance = 'orthodox' | 'southpaw' | 'switch' | 'unknown';

// ============================================================================
// Analysis
// ============================================================================

export interface FighterInfo {
  name: string;
  stance?: Stance;
  notes?: string;
}

export interface AnalyzeRequest {
  youtube_url: string;
  fighter_a?: FighterInfo;
  fighter_b?: FighterInfo;
  focus_areas?: string[];
  user_notes?: string;
}

export interface AnalyzeResponse {
  analysis_id: string;
  video_id: string;
  status: AnalysisStatus;
  message: string;
}

export interface AnalysisStatusResponse {
  analysis_id: string;
  video_id: string;
  status: AnalysisStatus;
  progress_pct: number;
  current_step?: string;
  error_message?: string;
  report?: FightReport;
}

// ============================================================================
// Fight Report
// ============================================================================

export interface KeyMoment {
  timestamp_sec: number;
  description: string;
  significance: string;
  tags: string[];
}

export interface TimestampedClip {
  t0: number;
  t1: number;
  label: string;
  coaching_note: string;
  priority: number;
}

export interface PatternObservation {
  pattern: string;
  frequency: string;
  timestamps: number[];
  coaching_note: string;
}

export interface RoundBreakdown {
  round_num: number;
  key_moments: KeyMoment[];
  dominant_fighter?: string;
  summary: string;
}

export interface Drill {
  name: string;
  description: string;
  duration_minutes: number;
  focus: string;
}

export interface TrainingRecommendation {
  theme: string;
  drills: Drill[];
  sparring_constraints: string[];
  notes: string;
}

export interface FightQuality {
  entertainment_rating: number;  // 1-10
  action_level: string;  // war/active/measured/staring contest
  would_rewatch: boolean;
  honest_take: string;
}

export interface FightReport {
  analysis_id: string;
  video_id: string;
  generated_at: string;

  // Fighter Info
  fighter_a?: FighterInfo;
  fighter_b?: FighterInfo;

  // Summary
  summary: string;
  fighter_a_assessment?: string[];  // Bullet points
  fighter_b_assessment?: string[];  // Bullet points
  coaching_insights?: string;
  fight_quality?: FightQuality;

  // Pattern Analysis
  stance_and_positioning: PatternObservation[];
  defense_patterns: PatternObservation[];
  offense_patterns: PatternObservation[];
  range_management: PatternObservation[];
  tells_and_timing: PatternObservation[];

  // Round by Round
  round_by_round: RoundBreakdown[];

  // Clips
  timestamped_clips: TimestampedClip[];

  // Training Plan
  training_plan: TrainingRecommendation[];

  // Event Info
  event?: string;  // e.g., "UFC 287"
  matchup_number?: number;  // e.g., 2 for rematch

  // Metadata
  total_duration_sec: number;
  frames_analyzed: number;
  transcript_available: boolean;
}

// ============================================================================
// Chat
// ============================================================================

export interface ChatRequest {
  session_id: string;
  analysis_id?: string;
  message: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
  analysis_id?: string;
  suggested_clips?: TimestampedClip[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  clips?: TimestampedClip[];
}

// ============================================================================
// UI State
// ============================================================================

export interface AnalysisState {
  isAnalyzing: boolean;
  analysisId?: string;
  status: AnalysisStatus;
  progress: number;
  currentStep?: string;
  report?: FightReport;
  error?: string;
}

export interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string;
}
