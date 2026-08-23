'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Swords, Loader2, Search, CheckCircle2, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  ALLOWED_MODELS,
  SPORTS,
  type AllowedModel,
  type FighterInput,
  type FighterSearchResult,
  type FightCandidate,
  type PredictRequest,
  type Sport,
} from '../lib/predictorTypes';
import { searchFighterFights, PredictorAPIError } from '../lib/predictorClient';

const YOUTUBE_RX = /(youtube\.com|youtu\.be)/i;
const MAX_URLS = 10;
const SEARCH_DEBOUNCE_MS = 700;

type FighterMode = 'search' | 'paste';

interface FighterCardState {
  name: string;
  mode: FighterMode;
  fightUrls: string[];           // unified output sent to backend
  manualUrls: string[];          // paste-mode editing buffer (separate so toggling modes is non-destructive)
  searchResult: FighterSearchResult | null;
  isSearching: boolean;
  searchError: string | null;
}

interface Props {
  onSubmit: (request: PredictRequest) => void;
  disabled?: boolean;
}

function blankState(): FighterCardState {
  return {
    name: '',
    mode: 'search',
    fightUrls: [],
    manualUrls: [''],
    searchResult: null,
    isSearching: false,
    searchError: null,
  };
}

// ============================================================================
// FighterColumn — handles both search and paste modes
// ============================================================================

function FighterColumn({
  label,
  accentColor,
  state,
  sport,
  onChange,
  disabled,
}: {
  label: string;
  accentColor: string;
  state: FighterCardState;
  sport: Sport;
  onChange: Dispatch<SetStateAction<FighterCardState>>;
  disabled: boolean;
}) {
  // Functional setter pattern everywhere — avoids stale-closure bugs in the
  // debounced/async search flow that would otherwise clobber the user's typed
  // name when the search call resolves several hundred ms later.
  const update = useCallback(
    (patch: Partial<FighterCardState>) =>
      onChange((prev) => ({ ...prev, ...patch })),
    [onChange],
  );

  // Debounced search trigger — kicks off after the user stops typing
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (name: string, refresh = false) => {
      const trimmed = name.trim();
      if (trimmed.length < 2) return;
      onChange((prev) => ({ ...prev, isSearching: true, searchError: null }));
      try {
        const result = await searchFighterFights({
          name: trimmed,
          sport,
          limit: 5,
          refresh,
        });
        // Functional setter — never overwrites `name` (which the user may
        // have kept typing while the request was in flight). We only update
        // the search-result fields.
        onChange((prev) => ({
          ...prev,
          searchResult: result,
          isSearching: false,
          searchError: null,
        }));
      } catch (err) {
        const msg =
          err instanceof PredictorAPIError ? err.detail : 'Search failed';
        onChange((prev) => ({
          ...prev,
          isSearching: false,
          searchError: msg,
        }));
      }
    },
    [sport, onChange],
  );

  // Auto-search when in search mode and name stabilizes
  useEffect(() => {
    if (state.mode !== 'search') return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (state.name.trim().length < 2) return;
    const captured = state.name;
    searchTimerRef.current = setTimeout(() => {
      runSearch(captured);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [state.name, state.mode, runSearch]);

  // ---------- Selected URL helpers (search mode) ----------
  const selectedSet = new Set(state.fightUrls);

  const toggleCandidate = (cand: FightCandidate) => {
    const url = cand.youtube_url;
    if (selectedSet.has(url)) {
      update({ fightUrls: state.fightUrls.filter((u) => u !== url) });
      return;
    }
    if (state.fightUrls.length >= MAX_URLS) return;
    update({ fightUrls: [...state.fightUrls, url] });
  };

  // ---------- Paste mode helpers ----------
  const setManualUrl = (idx: number, value: string) => {
    const next = [...state.manualUrls];
    next[idx] = value;
    update({
      manualUrls: next,
      fightUrls: next.map((u) => u.trim()).filter((u) => u.length > 0),
    });
  };

  const addManualUrl = () => {
    if (state.manualUrls.length >= MAX_URLS) return;
    update({ manualUrls: [...state.manualUrls, ''] });
  };

  const removeManualUrl = (idx: number) => {
    if (state.manualUrls.length === 1) {
      update({ manualUrls: [''], fightUrls: [] });
      return;
    }
    const next = state.manualUrls.filter((_, i) => i !== idx);
    update({
      manualUrls: next,
      fightUrls: next.map((u) => u.trim()).filter((u) => u.length > 0),
    });
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px',
        borderTop: `3px solid ${accentColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: accentColor,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {state.fightUrls.length}/{MAX_URLS} URLs picked
        </span>
      </div>

      {/* Fighter name (always visible) */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={state.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Fighter name"
          disabled={disabled}
          style={{
            width: '100%',
            padding: '12px 14px 12px 38px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '15px',
            fontWeight: 500,
            outline: 'none',
          }}
        />
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: state.isSearching ? accentColor : 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* MODE: search */}
      {state.mode === 'search' && (
        <SearchModeBody
          state={state}
          accentColor={accentColor}
          disabled={disabled}
          selectedSet={selectedSet}
          onToggleCandidate={toggleCandidate}
          onRefresh={() => runSearch(state.name, true)}
        />
      )}

      {/* MODE: paste */}
      {state.mode === 'paste' && (
        <PasteModeBody
          state={state}
          disabled={disabled}
          onSetUrl={setManualUrl}
          onAddUrl={addManualUrl}
          onRemoveUrl={removeManualUrl}
        />
      )}

      {/* Mode toggle (small link) */}
      <button
        type="button"
        onClick={() =>
          update({ mode: state.mode === 'search' ? 'paste' : 'search' })
        }
        disabled={disabled}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '11px',
          textAlign: 'left',
          padding: '4px 0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        {state.mode === 'search'
          ? '↳ Or paste YouTube URLs manually'
          : '↳ Back to search by fighter name'}
      </button>
    </div>
  );
}

// ============================================================================
// Search-mode body
// ============================================================================

function SearchModeBody({
  state,
  accentColor,
  disabled,
  selectedSet,
  onToggleCandidate,
  onRefresh,
}: {
  state: FighterCardState;
  accentColor: string;
  disabled: boolean;
  selectedSet: Set<string>;
  onToggleCandidate: (cand: FightCandidate) => void;
  onRefresh: () => void;
}) {
  if (state.name.trim().length < 2) {
    return (
      <div
        style={{
          padding: '12px 14px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Type at least 2 characters to search.
      </div>
    );
  }

  if (state.isSearching) {
    return (
      <div
        style={{
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}
      >
        <Loader2 size={14} className="spin" style={{ color: accentColor }} />
        Looking up recent fights…
      </div>
    );
  }

  if (state.searchError) {
    return (
      <div
        style={{
          padding: '10px 12px',
          fontSize: '12px',
          color: 'var(--error)',
          background: 'rgba(239,68,68,0.08)',
          borderLeft: '3px solid var(--error)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <AlertCircle size={14} />
        {state.searchError}
      </div>
    );
  }

  const result = state.searchResult;
  if (!result) return null;

  if (result.search_failed) {
    return (
      <div
        style={{
          padding: '10px 12px',
          fontSize: '12px',
          color: 'var(--error)',
          background: 'rgba(239,68,68,0.08)',
          borderLeft: '3px solid var(--error)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <AlertCircle size={14} />
        Fight search is temporarily unavailable. Paste YouTube URLs manually
        below.
      </div>
    );
  }

  if (result.slots.length === 0) {
    return (
      <div
        style={{
          padding: '12px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}
      >
        No recent fights found. Try the exact spelling, switch sport, or use
        manual paste below.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header: cached badge + refresh */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          {result.slots.length} fight{result.slots.length !== 1 ? 's' : ''} found
        </span>
        {result.cached && (
          <span
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '10px',
            }}
          >
            cached
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          aria-label="Refresh search"
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
          }}
        >
          <RefreshCw size={11} /> refresh
        </button>
      </div>

      {result.slots.map((slot, idx) => (
        <div
          key={idx}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}
          >
            <span>vs {slot.fight.opponent}</span>
            {slot.fight.event && (
              <span style={{ color: 'var(--text-muted)' }}>· {slot.fight.event}</span>
            )}
            {slot.fight.date && (
              <span style={{ color: 'var(--text-muted)' }}>· {slot.fight.date}</span>
            )}
            {slot.fight.result_summary && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: accentColor,
                }}
              >
                {slot.fight.result_summary}
              </span>
            )}
          </div>

          {slot.candidates.length === 0 ? (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              No validated YouTube URL — paste one manually if you have it.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {slot.candidates.map((cand) => {
                const isSelected = selectedSet.has(cand.youtube_url);
                return (
                  <motion.button
                    key={cand.youtube_url}
                    type="button"
                    onClick={() => onToggleCandidate(cand)}
                    disabled={
                      disabled ||
                      (!isSelected && state.fightUrls.length >= MAX_URLS)
                    }
                    whileHover={!disabled ? { scale: 1.005 } : undefined}
                    style={{
                      textAlign: 'left',
                      background: isSelected
                        ? `${accentColor}22`
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected
                        ? `1px solid ${accentColor}66`
                        : '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2
                      size={14}
                      style={{
                        color: isSelected ? accentColor : 'var(--text-muted)',
                        opacity: isSelected ? 1 : 0.35,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cand.title || '(untitled)'}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cand.channel || 'unknown channel'}
                        {cand.duration_sec !== null && cand.duration_sec !== undefined && (
                          <span
                            style={{
                              marginLeft: '6px',
                              fontFamily: 'monospace',
                              color:
                                cand.duration_sec >= 900 && cand.duration_sec <= 3000
                                  ? '#22c55e'    // 15-50 min: likely full fight
                                  : (cand.duration_sec >= 600 && cand.duration_sec < 900)
                                    || (cand.duration_sec > 3000 && cand.duration_sec <= 3900)
                                  ? 'var(--text-muted)'  // 10-15 or 50-65: edge
                                  : 'var(--warning)',    // <10 or >65: highlight/comp
                            }}
                          >
                            · {Math.floor(cand.duration_sec / 60)}:
                            {String(cand.duration_sec % 60).padStart(2, '0')}
                          </span>
                        )}
                        {cand.validated && ' · ✓'}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {result.notes.length > 0 && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            paddingTop: '4px',
          }}
        >
          {result.notes.map((n, i) => (
            <div key={i}>· {n}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Paste-mode body — the legacy URL paste UI
// ============================================================================

function PasteModeBody({
  state,
  disabled,
  onSetUrl,
  onAddUrl,
  onRemoveUrl,
}: {
  state: FighterCardState;
  disabled: boolean;
  onSetUrl: (idx: number, value: string) => void;
  onAddUrl: () => void;
  onRemoveUrl: (idx: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <AnimatePresence initial={false}>
        {state.manualUrls.map((url, idx) => {
          const isInvalid = url.length > 0 && !YOUTUBE_RX.test(url);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
            >
              <input
                type="url"
                value={url}
                onChange={(e) => onSetUrl(idx, e.target.value)}
                placeholder={`Fight ${idx + 1} YouTube URL`}
                disabled={disabled}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isInvalid ? 'var(--error)' : 'var(--glass-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => onRemoveUrl(idx)}
                disabled={disabled || state.manualUrls.length === 1}
                aria-label="Remove URL"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  cursor:
                    disabled || state.manualUrls.length === 1
                      ? 'not-allowed'
                      : 'pointer',
                  padding: '8px',
                  display: 'flex',
                  opacity: state.manualUrls.length === 1 ? 0.3 : 1,
                }}
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onAddUrl}
        disabled={disabled || state.manualUrls.length >= MAX_URLS}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        style={{
          background: 'transparent',
          border: '1px dashed var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-muted)',
          cursor:
            disabled || state.manualUrls.length >= MAX_URLS
              ? 'not-allowed'
              : 'pointer',
          padding: '8px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          opacity: state.manualUrls.length >= MAX_URLS ? 0.4 : 1,
        }}
      >
        <Plus size={14} /> Add fight URL
      </motion.button>
    </div>
  );
}

// ============================================================================
// Top-level component
// ============================================================================

export default function PredictionInput({ onSubmit, disabled = false }: Props) {
  const [fighterA, setFighterA] = useState<FighterCardState>(blankState());
  const [fighterB, setFighterB] = useState<FighterCardState>(blankState());
  const [sport, setSport] = useState<Sport>('mma');
  const [model, setModel] = useState<AllowedModel>('gpt-4o');
  const [error, setError] = useState<string | null>(null);

  const buildFighterInput = (s: FighterCardState): FighterInput => ({
    name: s.name.trim(),
    fight_urls: s.fightUrls.map((u) => u.trim()).filter((u) => u.length > 0),
  });

  const validate = (): string | null => {
    const a = buildFighterInput(fighterA);
    const b = buildFighterInput(fighterB);

    if (!a.name) return 'Fighter A name is required';
    if (!b.name) return 'Fighter B name is required';
    if (a.name.toLowerCase() === b.name.toLowerCase())
      return 'Fighters must be different';
    if (a.fight_urls.length === 0)
      return 'Fighter A needs at least 1 YouTube URL — pick from search or paste manually';
    if (b.fight_urls.length === 0)
      return 'Fighter B needs at least 1 YouTube URL — pick from search or paste manually';

    for (const url of [...a.fight_urls, ...b.fight_urls]) {
      if (!YOUTUBE_RX.test(url)) return `Not a YouTube URL: ${url}`;
    }
    return null;
  };

  const handleSubmit = () => {
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    onSubmit({
      fighter_a: buildFighterInput(fighterA),
      fighter_b: buildFighterInput(fighterB),
      sport,
      model,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        <FighterColumn
          label="Fighter A"
          accentColor="#3b82f6"
          state={fighterA}
          sport={sport}
          onChange={setFighterA}
          disabled={disabled}
        />
        <FighterColumn
          label="Fighter B"
          accentColor="#ef4444"
          state={fighterB}
          sport={sport}
          onChange={setFighterB}
          disabled={disabled}
        />
      </div>

      <div
        className="glass-card"
        style={{
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Sport
          </span>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value as Sport)}
            disabled={disabled}
            style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
            }}
          >
            {SPORTS.map((s) => (
              <option key={s.id} value={s.id} style={{ background: 'var(--bg-secondary)' }}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Synthesis Model
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AllowedModel)}
            disabled={disabled}
            style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
            }}
          >
            {ALLOWED_MODELS.map((m) => (
              <option key={m.id} value={m.id} style={{ background: 'var(--bg-secondary)' }}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          whileHover={!disabled ? { scale: 1.02 } : undefined}
          whileTap={!disabled ? { scale: 0.98 } : undefined}
          style={{
            padding: '12px 20px',
            background: 'var(--accent-gradient)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {disabled ? <Loader2 size={18} className="spin" /> : <Swords size={18} />}
          {disabled ? 'Predicting…' : 'Predict Winner'}
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card"
            style={{
              padding: '12px 16px',
              borderLeft: '3px solid var(--error)',
              background: 'rgba(239,68,68,0.08)',
            }}
          >
            <span style={{ color: 'var(--error)', fontSize: '13px' }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
