'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Info } from 'lucide-react';
import KnowledgeGraph3D from '../components/KnowledgeGraph3D';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function GraphPage() {
  const [showLegendHint, setShowLegendHint] = useState(true);

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={22} style={{ color: 'var(--accent-primary)' }} />
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                margin: 0,
                background:
                  'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Knowledge Graph
            </h1>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
            }}
          >
            athletes · fights · predictions
          </div>
        </header>

        {showLegendHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{
              padding: '12px 14px',
              marginBottom: '14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              borderLeft: '3px solid var(--accent-primary)',
            }}
          >
            <Info
              size={14}
              style={{
                color: 'var(--accent-primary)',
                marginTop: '2px',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, lineHeight: 1.55 }}>
              Drag to orbit. Scroll to zoom. Click a node to fly to it. Hover to
              highlight neighbors. Click a swatch in the legend (bottom-right)
              to hide that node type. Top-right toolbar: refresh, fit, reset,
              fullscreen (Esc to exit).
            </div>
            <button
              type="button"
              onClick={() => setShowLegendHint(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              dismiss
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          <KnowledgeGraph3D
            fetchUrl={`${BACKEND_URL}/api/v1/knowledge-graph`}
            height={680}
            backgroundColor="#020617"
          />
        </motion.div>

        <footer
          style={{
            textAlign: 'center',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--glass-border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
          }}
        >
          Live snapshot of the Supabase KG · refreshes on demand
        </footer>
      </div>
    </main>
  );
}
