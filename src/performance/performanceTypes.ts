export type EngineQualityLevel = 'ultra' | 'high' | 'medium' | 'low' | 'emergency';

export type QualityOverrideMode = 'auto' | EngineQualityLevel;

export const ENGINE_QUALITY_LABELS: Record<EngineQualityLevel, string> = {
  ultra: 'Ultra',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
  emergency: 'Emergencial',
};

export const ENGINE_QUALITY_ORDER: readonly EngineQualityLevel[] = [
  'ultra',
  'high',
  'medium',
  'low',
  'emergency',
];

export type ActiveRenderMode =
  | 'webgl-2pass-bitmap'
  | 'webgl-2pass-copy'
  | 'webgl-1pass-hybrid'
  | 'hybrid-prerendered'
  | 'css-emergency'
  | 'suspended';

export const RENDER_MODE_LABELS: Record<ActiveRenderMode, string> = {
  'webgl-2pass-bitmap': 'WebGL 2-Pass (Bitmap GPU)',
  'webgl-2pass-copy': 'WebGL 2-Pass (Canvas Fallback)',
  'webgl-1pass-hybrid': 'WebGL 1-Pass + Híbrido Frontal',
  'hybrid-prerendered': 'Híbrido Pré-Renderizado (WebP + CSS)',
  'css-emergency': 'CSS Emergencial (Horizonte Puro)',
  suspended: 'Suspenso (Fora de Cena)',
};

export interface HardwareCapabilitySnapshot {
  webglSupported: boolean;
  webglVersion: 0 | 1 | 2;
  isSoftwareGl: boolean;
  glVendor: string | null;
  glRenderer: string | null;
  isMobile: boolean;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  prefersReducedMotion: boolean;
  supportsLongTaskObserver: boolean;
  supportsGpuTimer: boolean;
  supportsBitmapRenderer: boolean;
}

export interface PerformanceMetricsSnapshot {
  currentFps: number | null;
  avgFrameTimeMs: number | null;
  medianFrameTimeMs: number | null;
  p95FrameTimeMs: number | null;
  framesOver16ms: number;
  framesOver33ms: number;
  slowStallCount: number;
  longTaskCount: number | null;
  gpuFrameTimeMs: number | null;
  activeQuality: EngineQualityLevel;
  overrideMode: QualityOverrideMode;
  dsrScale: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  canvasPixelCount: number;
  activeRafCount: number;
  activeWebglContextCount: number;
  activeRenderMode: ActiveRenderMode;
  lastTransitionReason: string;
  sampleCount: number;
}
