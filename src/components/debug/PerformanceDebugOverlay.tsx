import React, { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import {
  formatQualityReportText,
  getHardwareCapabilities,
  getPerformanceMetricsSnapshot,
  setManualQualityOverride,
} from '../../performance/performanceRuntime';
import {
  ENGINE_QUALITY_LABELS,
  ENGINE_QUALITY_ORDER,
  RENDER_MODE_LABELS,
  type PerformanceMetricsSnapshot,
  type QualityOverrideMode,
} from '../../performance/performanceTypes';

const OVERRIDE_OPTIONS: ReadonlyArray<{ value: QualityOverrideMode; label: string }> = [
  { value: 'auto', label: 'Automático' },
  ...ENGINE_QUALITY_ORDER.map((q) => ({ value: q, label: ENGINE_QUALITY_LABELS[q] })),
];

function fmtMs(val: number | null): string {
  return val === null ? 'N/D' : `${val.toFixed(1)} ms`;
}

export function PerformanceDebugOverlay() {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [snap, setSnap] = useState<PerformanceMetricsSnapshot>(() =>
    getPerformanceMetricsSnapshot()
  );

  useEffect(() => {
    const refresh = () => {
      setSnap(getPerformanceMetricsSnapshot());
    };
    refresh();
    const timer = window.setInterval(refresh, 350);
    return () => window.clearInterval(timer);
  }, []);

  const caps = getHardwareCapabilities();

  const handleCopy = async () => {
    const text = formatQualityReportText();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
        return;
      }
    } catch {
      // Fallback abaixo se Clipboard API não estiver disponível
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignora silenciosamente
    }
  };

  return (
    <aside
      aria-label="Diagnóstico de performance da engine"
      data-testid="performance-debug-hud"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-[360px] z-[95] rounded-2xl border border-white/15 bg-[#0a0b0d]/92 text-[#e8e7e0] shadow-2xl text-[11px] font-mono leading-snug backdrop-blur-md"
    >
      {/* Cabeçalho compacto */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-[#a4c75a] shrink-0" aria-hidden="true" />
          <span className="font-semibold tracking-wider uppercase text-[10px] text-[#e8e7e0] truncate">
            LIMIAR ENGINE HUD
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#a18ac8]/25 text-[#d7c8f4] text-[10px] font-semibold">
            {ENGINE_QUALITY_LABELS[snap.activeQuality]}
          </span>
          <span className="text-[10px] text-white/65">
            {snap.currentFps !== null ? `${snap.currentFps} FPS` : 'Idle'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Recolher diagnóstico' : 'Expandir diagnóstico'}
          className="p-1 rounded hover:bg-white/10 text-white/75 hover:text-white transition-colors"
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-2.5 max-h-[72dvh] overflow-y-auto">
          {/* Métricas de tempo de quadro */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase text-white/55">FPS (Mediana)</div>
              <div className="text-[12px] font-semibold text-[#a4c75a]">
                {snap.currentFps !== null ? `${snap.currentFps}` : 'N/D'}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase text-white/55">Avg / Med</div>
              <div className="text-[11px]">
                {snap.avgFrameTimeMs !== null ? `${snap.avgFrameTimeMs.toFixed(1)}` : 'N/D'} /{' '}
                {snap.medianFrameTimeMs !== null ? `${snap.medianFrameTimeMs.toFixed(1)}ms` : 'N/D'}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase text-white/55">P95 Frame</div>
              <div className="text-[11px]">{fmtMs(snap.p95FrameTimeMs)}</div>
            </div>
          </div>

          {/* Contadores reais de quedas / stalls / GPU / Long Tasks */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] border-t border-white/10 pt-2">
            <div className="flex justify-between gap-2">
              <span className="text-white/60">&gt;16.67ms:</span>
              <span>{snap.framesOver16ms}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60">&gt;33.33ms:</span>
              <span>{snap.framesOver33ms}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60">Stalls (&gt;95ms):</span>
              <span>{snap.slowStallCount}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60">Long Tasks:</span>
              <span>{snap.longTaskCount !== null ? snap.longTaskCount : 'N/D'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60">GPU Time:</span>
              <span>{fmtMs(snap.gpuFrameTimeMs)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60">DSR / Buffer:</span>
              <span>
                {Math.round(snap.dsrScale * 100)}% ({snap.canvasWidthPx}×{snap.canvasHeightPx})
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60">Pixels Canvas:</span>
              <span>{snap.canvasPixelCount.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/60">rAF / WebGL:</span>
              <span>
                {snap.activeRafCount} / {snap.activeWebglContextCount}
              </span>
            </div>
          </div>

          {/* Modo de renderização e Hardware Probe */}
          <div className="space-y-1 text-[10px] border-t border-white/10 pt-2">
            <div className="flex justify-between gap-2">
              <span className="text-white/60 shrink-0">Pipeline:</span>
              <span className="text-right text-[#d7c8f4] truncate">
                {RENDER_MODE_LABELS[snap.activeRenderMode]}
              </span>
            </div>
            {caps && (
              <div className="flex justify-between gap-2">
                <span className="text-white/60 shrink-0">GPU / DPR:</span>
                <span className="text-right text-white/85 truncate" title={caps.glRenderer ?? ''}>
                  {caps.glRenderer ? caps.glRenderer : caps.webglSupported ? 'WebGL' : 'Sem WebGL'} ·{' '}
                  {caps.dpr}x
                </span>
              </div>
            )}
            <div className="rounded-lg bg-white/5 px-2 py-1.5 text-[10px] text-white/80">
              <span className="text-white/50">Transição: </span>
              {snap.lastTransitionReason}
            </div>
          </div>

          {/* Seletor de Override Manual (A/B) */}
          <div className="space-y-1.5 border-t border-white/10 pt-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60 uppercase">Modo de Qualidade</span>
              <span className="text-white/75">
                {snap.overrideMode === 'auto' ? 'Automático' : `Manual (${ENGINE_QUALITY_LABELS[snap.overrideMode]})`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {OVERRIDE_OPTIONS.map((opt) => {
                const isSelected = snap.overrideMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setManualQualityOverride(opt.value)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${
                      isSelected
                        ? 'bg-[#a4c75a] text-[#080909] border-[#a4c75a]'
                        : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Copiar Relatório */}
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] uppercase tracking-wider font-semibold transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#a4c75a]" />
                <span>Relatório copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar relatório</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
