'use client';

/**
 * KnowledgeGraph3D — adapted from the agentic-kg-pipeline skill's drop-in
 * component. Inline-styled to match the rest of the Fight Predictor frontend
 * (no Tailwind). Read-only mode — no edge edit/delete side panel.
 *
 * Renders the {nodes, edges, palette, metadata} payload from
 * /api/v1/knowledge-graph per assets/kg_schema.json. SSR-safe via
 * dynamic import of react-force-graph-3d.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Focus,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
});

// ── Types (mirror kg_schema.json) ──────────────────────────────────

export interface KGNode {
  id: string;
  name: string;
  type: string;
  canonical?: boolean;
  subtitle?: string;
  props?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface KGEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
  frequency?: number;
  [key: string]: unknown;
}

export interface KGPayload {
  nodes: KGNode[];
  edges: KGEdge[];
  palette?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph3DProps {
  data?: KGPayload;
  fetchUrl?: string;
  refreshKey?: number | string;
  palette?: Record<string, string>;
  height?: number;
  backgroundColor?: string;
  onNodeClick?: (node: KGNode) => void;
  authHeader?: string;
}

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULT_NODE_PALETTE: Record<string, string> = {
  // Fight Predictor canonical types
  Athlete: '#a78bfa',
  Fight: '#60a5fa',
  Prediction: '#fb923c',
  Event: '#facc15',
  // Generic fallbacks (Organization, Person, Product, etc. — kept for forward compat)
  Organization: '#c084fc',
  Person: '#60a5fa',
  Product: '#4ade80',
  Concept: '#facc15',
  default: '#94a3b8',
};

const EDGE_NEUTRAL = '#334155';
const EDGE_DIM = '#0f172a';
const EDGE_HIGHLIGHT = '#cbd5e1';
const NODE_DIM = '#1f2937';

const LARGE_NODE_THRESHOLD = 140;
const LARGE_EDGE_THRESHOLD = 260;
// (sprite label threshold removed — using ForceGraph3D's built-in hover label)

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}
function fallbackColor(seed: string): string {
  return `hsl(${hashHue(seed)} 65% 60%)`;
}
function getNodeId(n: string | { id: string }): string {
  return typeof n === 'string' ? n : n.id;
}

// ── Component ──────────────────────────────────────────────────────

export default function KnowledgeGraph3D({
  data,
  fetchUrl,
  refreshKey,
  palette,
  height = 640,
  backgroundColor = '#020617',
  onNodeClick,
  authHeader,
}: KnowledgeGraph3DProps) {
  const [payload, setPayload] = useState<KGPayload | null>(data ?? null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string>('');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<KGNode | null>(null);
  const [size, setSize] = useState({ width: 800, height });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipElRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);

  // Hover highlight state (refs so repaint doesn't restart layout)
  const highlightNodesRef = useRef<Set<string>>(new Set());
  const highlightLinksRef = useRef<Set<string>>(new Set());
  const lastHoveredIdRef = useRef<string | null>(null);
  const mouseMoveRafRef = useRef<number | null>(null);

  const nodePalette = useMemo(
    () => ({
      ...DEFAULT_NODE_PALETTE,
      ...(payload?.palette ?? {}),
      ...(palette ?? {}),
    }),
    [palette, payload?.palette],
  );

  // ── Fetch ──
  useEffect(() => {
    if (data) {
      setPayload(data);
      setLoading(false);
      return;
    }
    if (!fetchUrl) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const headers: Record<string, string> = {};
    if (authHeader) headers.Authorization = authHeader;
    fetch(fetchUrl, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: KGPayload) => {
        if (cancelled) return;
        if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
          throw new Error('Response missing nodes/edges arrays');
        }
        setPayload(json);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message ?? 'Failed to load graph');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data, fetchUrl, refreshKey, authHeader, refreshNonce]);

  // ── Responsive sizing ──
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.max(420, Math.floor(entry.contentRect.height));
        setSize((s) => (s.width === w && s.height === h ? s : { width: w, height: h }));
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [isFullscreen]);

  // ── Esc to exit fullscreen ──
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // ── Derived graph data ──
  const graphData = useMemo(() => {
    if (!payload) return { nodes: [], links: [] };
    const visibleNodes = payload.nodes.filter((n) => !hidden.has(n.type));
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const degree: Record<string, number> = {};
    for (const e of payload.edges) {
      if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) continue;
      degree[e.source] = (degree[e.source] ?? 0) + 1;
      degree[e.target] = (degree[e.target] ?? 0) + 1;
    }
    return {
      nodes: visibleNodes.map((n) => ({
        ...n,
        degree: degree[n.id] ?? 0,
        val:
          Math.max(2.5, Math.min(9, 2.5 + Math.sqrt(degree[n.id] ?? 0) * 0.9)) *
          (n.canonical ? 1.4 : 1),
      })),
      links: payload.edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
          weight: e.weight ?? 1,
          frequency: e.frequency,
        })),
    };
  }, [payload, hidden]);

  const isLarge =
    graphData.nodes.length > LARGE_NODE_THRESHOLD ||
    graphData.links.length > LARGE_EDGE_THRESHOLD;

  const adjacency = useMemo(() => {
    const nodes = new Map<string, Set<string>>();
    const links = new Map<string, Set<string>>();
    for (const n of graphData.nodes) {
      nodes.set(n.id, new Set([n.id]));
      links.set(n.id, new Set());
    }
    for (const l of graphData.links) {
      const s = getNodeId(l.source as string);
      const t = getNodeId(l.target as string);
      const key = `${s}::${t}`;
      nodes.get(s)?.add(t);
      nodes.get(t)?.add(s);
      links.get(s)?.add(key);
      links.get(t)?.add(key);
    }
    return { nodes, links };
  }, [graphData.nodes, graphData.links]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    if (!payload) return c;
    for (const n of payload.nodes) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, [payload]);

  // Perf cleanup: use ForceGraph3D's built-in node rendering (cached spheres
  // internally) and built-in hover labels. The custom THREE.Group + SpriteText
  // path the skill shipped was creating GC pressure on large graphs.
  const colorFor = useCallback(
    (node: KGNode): string => {
      const direct = nodePalette[node.type];
      if (direct) return direct;
      return fallbackColor(node.type || node.id);
    },
    [nodePalette],
  );

  // ── Hover handlers — throttled to once per animation frame so we don't
  //    force a graph refresh on every mouse-move event from the canvas ──
  const handleNodeHover = useCallback(
    (n: object | null) => {
      const node = n as KGNode | null;
      const id = node?.id ?? null;
      if (lastHoveredIdRef.current === id) return;
      lastHoveredIdRef.current = id;
      setHovered(node);
      if (!node) {
        highlightNodesRef.current = new Set();
        highlightLinksRef.current = new Set();
      } else {
        highlightNodesRef.current = new Set(adjacency.nodes.get(node.id) ?? [node.id]);
        highlightLinksRef.current = new Set(adjacency.links.get(node.id) ?? []);
      }
      // Coalesce refresh() calls into the next paint — calling it on every
      // mouse-move stutters even on modern hardware
      if (mouseMoveRafRef.current != null) return;
      mouseMoveRafRef.current = requestAnimationFrame(() => {
        mouseMoveRafRef.current = null;
        const g = graphRef.current as { refresh?: () => void } | null;
        g?.refresh?.();
      });
    },
    [adjacency.links, adjacency.nodes],
  );

  // ── Color resolvers ──
  const resolveNodeColor = useCallback(
    (n: object) => {
      const node = n as KGNode;
      const highlights = highlightNodesRef.current;
      if (highlights.size === 0) return colorFor(node);
      return highlights.has(node.id) ? colorFor(node) : NODE_DIM;
    },
    [colorFor],
  );

  const resolveLinkColor = useCallback((l: object) => {
    const link = l as KGEdge;
    const key = `${getNodeId(link.source as string)}::${getNodeId(link.target as string)}`;
    const highlights = highlightLinksRef.current;
    if (highlights.size === 0) return EDGE_NEUTRAL;
    return highlights.has(key) ? EDGE_HIGHLIGHT : EDGE_DIM;
  }, []);

  const resolveLinkWidth = useCallback(
    (l: object) => {
      const link = l as KGEdge;
      const key = `${getNodeId(link.source as string)}::${getNodeId(link.target as string)}`;
      const highlights = highlightLinksRef.current;
      const w = link.weight ?? 1;
      if (highlights.size === 0) return Math.max(0.6, w * (isLarge ? 1.0 : 1.6));
      return highlights.has(key) ? Math.max(1.4, w * 2.4) : 0.2;
    },
    [isLarge],
  );

  // Stable callbacks for ForceGraph3D — inline arrows here would create new
  // refs every render, breaking the library's internal prop-equality checks.
  const resolveNodeVal = useCallback((n: object) => {
    return (n as KGNode & { val?: number }).val ?? 3;
  }, []);
  const resolveNodeLabel = useCallback((n: object) => {
    const node = n as KGNode;
    return `${node.name} · ${node.type}`;
  }, []);

  // ── Camera helpers ──
  function fitView(ms = 800) {
    const g = graphRef.current as
      | { zoomToFit?: (ms?: number, padding?: number) => void }
      | null;
    g?.zoomToFit?.(ms, 60);
  }
  function flyToNode(node: KGNode & { x?: number; y?: number; z?: number }) {
    const g = graphRef.current as
      | {
          cameraPosition?: (
            pos: { x: number; y: number; z: number },
            lookAt?: { x: number; y: number; z: number },
            ms?: number,
          ) => void;
        }
      | null;
    if (!g?.cameraPosition || node.x == null || node.y == null || node.z == null) return;
    const dist = 80;
    const r = Math.hypot(node.x, node.y, node.z) || 1;
    g.cameraPosition(
      {
        x: node.x * (1 + dist / r),
        y: node.y * (1 + dist / r),
        z: node.z * (1 + dist / r),
      },
      { x: node.x, y: node.y, z: node.z },
      900,
    );
  }

  const handleEngineStop = useCallback(() => {
    fitView(600);
  }, []);

  const handleNodeClick = useCallback(
    (n: object) => {
      const node = n as KGNode & { x?: number; y?: number; z?: number };
      flyToNode(node);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  // Direct DOM mutation — never trigger React re-render on mouse move.
  // setState on every pixel of motion was the main jerk source: each call
  // re-evaluated the entire component and forced ForceGraph3D to compare props.
  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const tip = tooltipElRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!tip || !rect) return;
    const x = Math.min(e.clientX - rect.left + 14, rect.width - 290);
    const y = Math.max(e.clientY - rect.top - 16, 8);
    tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  function toggleType(t: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function refresh() {
    setRefreshNonce((n) => n + 1);
  }

  // ── Style helpers ──
  const toolbarBtnStyle: React.CSSProperties = {
    background: 'rgba(2,6,23,0.85)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '6px',
    color: '#f1f5f9',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    /* blur dropped — stacking backdrop-filter over a WebGL canvas is GPU-expensive */
  };

  // ── States ──
  if (loading) {
    return (
      <div
        ref={containerRef}
        style={{
          height,
          background: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          borderRadius: 'var(--radius-md)',
          gap: '8px',
        }}
      >
        <Loader2 size={14} className="spin" /> Loading graph…
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={containerRef}
        style={{
          height,
          background: 'rgba(239,68,68,0.08)',
          borderLeft: '3px solid var(--error)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          color: 'var(--error)',
          fontSize: '13px',
        }}
      >
        Failed to load graph: {error}
      </div>
    );
  }

  if (!payload || payload.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          height,
          background: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        No graph data yet — run a prediction and athletes/fights will accrete here.
      </div>
    );
  }

  const wrapperStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: backgroundColor,
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        height,
        background: backgroundColor,
      };

  return (
    <div style={wrapperStyle}>
      {/* Top toolbar */}
      <div
        style={
          isFullscreen
            ? {
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(2,6,23,0.95)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                /* blur dropped — stacking backdrop-filter over a WebGL canvas is GPU-expensive */
              }
            : {
                position: 'absolute',
                top: '12px',
                left: '12px',
                right: '12px',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: '#e2e8f0',
            background: 'rgba(2,6,23,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            /* blur dropped — stacking backdrop-filter over a WebGL canvas is GPU-expensive */
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {(payload.metadata?.project as string) ?? 'Knowledge Graph'}
          </span>
          <span style={{ color: '#94a3b8' }}>
            · {graphData.nodes.length} nodes · {graphData.links.length} edges
          </span>
          {isLarge && (
            <span
              style={{
                borderRadius: '999px',
                border: '1px solid rgba(217,119,6,0.6)',
                background: 'rgba(120,53,15,0.4)',
                color: '#fcd34d',
                padding: '2px 8px',
                fontSize: '10px',
              }}
            >
              large mode
            </span>
          )}
          {isFullscreen && <span style={{ color: '#64748b' }}>(Esc to exit)</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button type="button" onClick={refresh} title="Refresh graph data" style={toolbarBtnStyle}>
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={() => fitView(800)} title="Fit to view" style={toolbarBtnStyle}>
            <Focus size={14} />
          </button>
          <button type="button" onClick={() => fitView(0)} title="Reset camera" style={toolbarBtnStyle}>
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            style={toolbarBtnStyle}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Canvas + overlays */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          flex: isFullscreen ? 1 : undefined,
          height: isFullscreen ? undefined : '100%',
          width: '100%',
          background: backgroundColor,
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Legend */}
        {Object.keys(typeCounts).length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              zIndex: 10,
              maxHeight: '60%',
              overflowY: 'auto',
              background: 'rgba(2,6,23,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '11px',
              color: '#f1f5f9',
              /* blur dropped — stacking backdrop-filter over a WebGL canvas is GPU-expensive */
              minWidth: '160px',
            }}
          >
            <div
              style={{
                marginBottom: '6px',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#94a3b8',
              }}
            >
              Nodes · click to toggle
            </div>
            {Object.keys(typeCounts)
              .sort()
              .map((t) => {
                const color = nodePalette[t] ?? fallbackColor(t);
                const isHidden = hidden.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '2px 0',
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      opacity: isHidden ? 0.4 : 1,
                      fontSize: '11px',
                    }}
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span>{t}</span>
                    <span style={{ marginLeft: 'auto', color: '#64748b' }}>{typeCounts[t]}</span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Hover tooltip — position via ref + CSS transform (no re-render on
            mouse move). Visibility toggles via display, content updates only
            when `hovered` changes (which is debounced via lastHoveredIdRef). */}
        <div
          ref={tooltipElRef}
          style={{
            position: 'absolute',
            zIndex: 20,
            maxWidth: '280px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(2,6,23,0.95)',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#f1f5f9',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            top: 0,
            left: 0,
            willChange: 'transform',
            display: hovered ? 'block' : 'none',
          }}
        >
          {hovered && (
            <>
              <div style={{ fontWeight: 600 }}>{hovered.name}</div>
              <div style={{ marginTop: '2px', fontSize: '11px', color: '#94a3b8' }}>
                {hovered.type}
                {hovered.canonical ? ' · canonical' : ''}
              </div>
              {hovered.subtitle && (
                <div style={{ marginTop: '4px', fontSize: '11px' }}>{hovered.subtitle}</div>
              )}
              {hovered.props && Object.keys(hovered.props).length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#cbd5e1' }}>
                  {Object.entries(hovered.props).slice(0, 4).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: '#64748b' }}>{k}:</span> {String(v)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {/* Reference `size` to keep ResizeObserver from being dead code-eliminated */}
        <span style={{ display: 'none' }} aria-hidden>{size.width}x{size.height}</span>

        <ForceGraph3D
          ref={graphRef as unknown as React.MutableRefObject<undefined>}
          graphData={graphData}
          width={size.width}
          height={isFullscreen ? size.height : height}
          backgroundColor={backgroundColor}
          controlType="orbit"
          enableNodeDrag={false}
          enableNavigationControls
          showNavInfo={false}
          // Built-in node rendering (cached internally) — way faster than the
          // custom THREE.Group / SpriteText path the skill shipped
          nodeColor={resolveNodeColor}
          nodeVal={resolveNodeVal}
          nodeOpacity={0.92}
          nodeResolution={isLarge ? 4 : 6}
          nodeLabel={resolveNodeLabel}
          // Edges — flat color, no continuously animated particles (those are
          // the single biggest GPU cost on medium graphs)
          linkColor={resolveLinkColor}
          linkOpacity={isLarge ? 0.35 : 0.55}
          linkWidth={resolveLinkWidth}
          linkResolution={2}
          linkDirectionalParticles={0}
          // Settle faster + smoother — cooldownTime caps physics in ms so it
          // doesn't drag for tick-based eternity on small graphs
          warmupTicks={0}
          cooldownTime={3000}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.32}
          onEngineStop={handleEngineStop}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
        />
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
