'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, Swords } from 'lucide-react';
import PredictionInput from '../components/PredictionInput';
import PredictionReportView from '../components/PredictionReport';
import MatchupFeatureRadar from '../components/MatchupFeatureRadar';
import AthleteProfileCard from '../components/AthleteProfileCard';
import {
  PredictorAPIError,
  pollPredictionStatus,
  startPrediction,
} from '../lib/predictorClient';
import type {
  PredictRequest,
  PredictionState,
  PredictionStatusResponse,
} from '../lib/predictorTypes';

export default function PredictPage() {
  const [request, setRequest] = useState<PredictRequest | null>(null);
  const [prediction, setPrediction] = useState<PredictionState>({
    isRunning: false,
    status: 'pending',
    progress: 0,
  });

  const handleSubmit = useCallback(async (req: PredictRequest) => {
    setRequest(req);
    setPrediction({
      isRunning: true,
      status: 'pending',
      progress: 2,
      currentStep: 'Submitting prediction…',
    });

    try {
      const accepted = await startPrediction(req);
      setPrediction((prev) => ({
        ...prev,
        predictionId: accepted.prediction_id,
        progress: 5,
        currentStep: 'Pipeline accepted',
      }));

      const final = await pollPredictionStatus(
        accepted.prediction_id,
        (status: PredictionStatusResponse) => {
          setPrediction((prev) => ({
            ...prev,
            status: status.pipeline_status,
            progress: status.progress_pct,
            currentStep: status.current_step ?? undefined,
            error: status.error_message ?? undefined,
            result: status,
          }));
        }
      );

      setPrediction({
        isRunning: false,
        predictionId: accepted.prediction_id,
        status: final.pipeline_status,
        progress: 100,
        currentStep: final.current_step ?? undefined,
        error: final.error_message ?? undefined,
        result: final,
      });
    } catch (err) {
      const detail =
        err instanceof PredictorAPIError ? err.detail : 'Prediction failed';
      setPrediction((prev) => ({
        ...prev,
        isRunning: false,
        status: 'failed',
        error: detail,
      }));
    }
  }, []);

  const handleReset = () => {
    setRequest(null);
    setPrediction({ isRunning: false, status: 'pending', progress: 0 });
  };

  const result = prediction.result;
  const fighterAName =
    result?.fighter_a_name || request?.fighter_a.name || 'Fighter A';
  const fighterBName =
    result?.fighter_b_name || request?.fighter_b.name || 'Fighter B';

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = useCallback(async () => {
    const contentEl = document.getElementById('prediction-content');
    if (!contentEl || exportingPdf) return;
    setExportingPdf(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Build the PDF container: title header + cloned analysis content
      const pdfContainer = document.createElement('div');
      pdfContainer.style.background = '#1a1a2e';
      pdfContainer.style.color = '#ffffff';
      pdfContainer.style.padding = '20px';

      const title = document.createElement('div');
      title.innerHTML = `
        <h1 style="margin:0 0 4px 0;font-size:22px;color:#ffffff;">
          Fight Prediction: ${fighterAName} vs ${fighterBName}
        </h1>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:20px;border-bottom:1px solid #333;padding-bottom:12px;">
          Generated ${new Date().toLocaleString()} · Fight Predictor · grounded in tape, never in odds
        </div>`;
      pdfContainer.appendChild(title);

      const clone = contentEl.cloneNode(true) as HTMLElement;
      // Force-open every collapsed section (framer-motion collapses via
      // inline height:0/opacity:0 — the clone carries those styles) so the
      // PDF contains the COMPLETE analysis, not the collapsed summary view.
      clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el.style.height === '0px' || el.style.opacity === '0') {
          el.style.height = 'auto';
          el.style.opacity = '1';
          el.style.overflow = 'visible';
        }
      });
      pdfContainer.appendChild(clone);
      document.body.appendChild(pdfContainer);

      const slug = `${fighterAName}-vs-${fighterBName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await html2pdf()
        .set({
          margin: 10,
          filename: `prediction-${slug}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: '#1a1a2e' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(pdfContainer)
        .save();

      document.body.removeChild(pdfContainer);
    } finally {
      setExportingPdf(false);
    }
  }, [exportingPdf, fighterAName, fighterBName]);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Swords size={22} style={{ color: 'var(--accent-primary)' }} />
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
              Fight Predictor
            </h1>
          </div>
          {prediction.result && !prediction.isRunning && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {result?.prediction_report && (
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: exportingPdf ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: exportingPdf ? 0.6 : 1,
                  }}
                >
                  <Download size={14} />
                  {exportingPdf ? 'Exporting…' : 'Export PDF'}
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                New Prediction
              </button>
            </div>
          )}
        </header>

        {/* Input phase */}
        {!request && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '14px',
                textAlign: 'center',
              }}
            >
              Drop YouTube URLs for each fighter&apos;s last 3–5 fights. Pipeline
              extracts deterministic metrics, pulls camp intel, and synthesizes a
              prediction grounded in the actual tape.
            </div>
            <PredictionInput onSubmit={handleSubmit} disabled={false} />
          </motion.div>
        )}

        {/* Progress phase */}
        {request && prediction.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{ padding: '20px', marginBottom: '20px' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <Loader2
                size={18}
                className="spin"
                style={{ color: 'var(--accent-primary)' }}
              />
              <span
                style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                {prediction.currentStep || 'Running pipeline…'}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {prediction.progress}% · {prediction.status}
              </span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${prediction.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Everything inside this wrapper is captured by Export PDF */}
        <div id="prediction-content">
        {/* Live profiles (visible mid-run as backend populates them) */}
        {request && (result?.fighter_a_profile || result?.fighter_b_profile) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <AthleteProfileCard
              fighterName={fighterAName}
              profile={result?.fighter_a_profile ?? null}
              campIntel={result?.fighter_a_camp_intel ?? null}
              accentColor="#3b82f6"
              defaultExpanded={false}
            />
            <AthleteProfileCard
              fighterName={fighterBName}
              profile={result?.fighter_b_profile ?? null}
              campIntel={result?.fighter_b_camp_intel ?? null}
              accentColor="#ef4444"
              defaultExpanded={false}
            />
          </motion.div>
        )}

        {/* Matchup features */}
        {result?.matchup_features && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '16px' }}
          >
            <MatchupFeatureRadar features={result.matchup_features} />
          </motion.div>
        )}

        {/* Final report */}
        {result?.prediction_report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PredictionReportView
              report={result.prediction_report}
              fighterAName={fighterAName}
              fighterBName={fighterBName}
            />
          </motion.div>
        )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {prediction.error && !prediction.isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card"
              style={{
                padding: '16px',
                marginTop: '16px',
                borderLeft: '3px solid var(--error)',
                background: 'rgba(239,68,68,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--error)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                Prediction failed
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {prediction.error}
              </div>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  marginTop: '12px',
                  background: 'transparent',
                  border: '1px solid var(--error)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: 'var(--error)',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <footer
          style={{
            textAlign: 'center',
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid var(--glass-border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
          }}
        >
          Fight Predictor · grounded in tape, never in odds
        </footer>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--accent-gradient);
          border-radius: 4px;
        }
      `}</style>
    </main>
  );
}
