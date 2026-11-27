import {
  DataTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  UnsignedByteType,
  Vector2,
  WebGLRenderer,
} from 'three';
import type { BlackHoleOperationalState } from '../../motion/gravitationalTimeline';
import { frameScheduler } from '../../performance/frameScheduler';
import { computeScaledCanvasDimensions } from '../../performance/performanceGovernor';
import {
  performanceGovernor,
  registerHardwareCapabilities,
  reportEngineTelemetry,
  trackWebglContextChange,
} from '../../performance/performanceRuntime';
import type {
  ActiveRenderMode,
  EngineQualityLevel,
} from '../../performance/performanceTypes';
import {
  BLACKHOLE_VERTEX_SHADER,
  createBlackHoleFragmentShader,
  createNoiseLutBuffer,
  type BlackHoleShaderVariant,
} from './blackholeShader';

export interface WebglCapabilityProbe {
  supported: boolean;
  webglVersion: 0 | 1 | 2;
  isSoftwareGl: boolean;
  glVendor: string | null;
  glRenderer: string | null;
  supportsGpuTimer: boolean;
  supportsBitmapRenderer: boolean;
}

interface DisjointTimerQueryExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
  QUERY_RESULT_AVAILABLE_EXT?: number;
  QUERY_RESULT_EXT?: number;
}

type CanvasWithTransferToBitmap = HTMLCanvasElement & {
  transferToImageBitmap?: () => ImageBitmap;
};

let cachedProbe: WebglCapabilityProbe | null = null;

export function probeWebglCapability(): WebglCapabilityProbe {
  if (cachedProbe) return cachedProbe;

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      supported: false,
      webglVersion: 0,
      isSoftwareGl: false,
      glVendor: null,
      glRenderer: null,
      supportsGpuTimer: false,
      supportsBitmapRenderer: false,
    };
  }

  try {
    const probeCanvas = document.createElement('canvas');
    const gl2 = probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null;
    const gl =
      gl2 || (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);

    if (!gl) {
      const noGl: WebglCapabilityProbe = {
        supported: false,
        webglVersion: 0,
        isSoftwareGl: false,
        glVendor: null,
        glRenderer: null,
        supportsGpuTimer: false,
        supportsBitmapRenderer: false,
      };
      cachedProbe = noGl;
      return noGl;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const glVendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? '') || null
      : null;
    const glRenderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '') || null
      : null;
    const isSoftwareGl =
      /SwiftShader|llvmpipe|softpipe|Microsoft Basic Render/i.test(
        glRenderer ?? ''
      );

    const supportsGpuTimer = Boolean(
      gl2
        ? gl2.getExtension('EXT_disjoint_timer_query_webgl2')
        : gl.getExtension('EXT_disjoint_timer_query')
    );

    let supportsBitmapRenderer = false;
    try {
      const testCanvas = document.createElement('canvas') as CanvasWithTransferToBitmap;
      supportsBitmapRenderer =
        typeof testCanvas.transferToImageBitmap === 'function' &&
        Boolean(document.createElement('canvas').getContext('bitmaprenderer'));
    } catch {
      supportsBitmapRenderer = false;
    }

    gl.getExtension('WEBGL_lose_context')?.loseContext();

    const result: WebglCapabilityProbe = {
      supported: true,
      webglVersion: gl2 ? 2 : 1,
      isSoftwareGl,
      glVendor,
      glRenderer,
      supportsGpuTimer,
      supportsBitmapRenderer,
    };
    cachedProbe = result;

    const nav =
      typeof navigator !== 'undefined'
        ? (navigator as Navigator & { deviceMemory?: number })
        : undefined;
    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const isMobile = window.innerWidth < 768;

    registerHardwareCapabilities({
      webglSupported: true,
      webglVersion: result.webglVersion,
      isSoftwareGl: result.isSoftwareGl,
      glVendor: result.glVendor,
      glRenderer: result.glRenderer,
      isMobile,
      hardwareConcurrency:
        typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
      deviceMemoryGb:
        typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : null,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      prefersReducedMotion,
      supportsLongTaskObserver:
        typeof PerformanceObserver !== 'undefined' &&
        Array.isArray(
          (PerformanceObserver as typeof PerformanceObserver & {
            supportedEntryTypes?: string[];
          }).supportedEntryTypes
        ) &&
        (
          PerformanceObserver as typeof PerformanceObserver & {
            supportedEntryTypes?: string[];
          }
        ).supportedEntryTypes!.includes('longtask'),
      supportsGpuTimer: result.supportsGpuTimer,
      supportsBitmapRenderer: result.supportsBitmapRenderer,
    });

    return result;
  } catch {
    const failed: WebglCapabilityProbe = {
      supported: false,
      webglVersion: 0,
      isSoftwareGl: false,
      glVendor: null,
      glRenderer: null,
      supportsGpuTimer: false,
      supportsBitmapRenderer: false,
    };
    cachedProbe = failed;
    return failed;
  }
}

export interface BlackHoleUniformInput {
  progress?: number;
  horizonRadius?: number;
  warp?: number;
  pointerX?: number;
  pointerY?: number;
  lightMode?: boolean;
}

export interface BlackHoleEngineOptions {
  container: HTMLElement;
  frontOverlayContainer?: HTMLElement;
  initialQuality: EngineQualityLevel;
  isSoftwareGl: boolean;
  lightMode: boolean;
  onFirstFrame?: () => void;
  onQualityChange?: (level: EngineQualityLevel) => void;
  onContextLoss?: () => void;
  onContextRestored?: () => void;
}

export interface BlackHoleEngineController {
  setState: (state: BlackHoleOperationalState) => void;
  setQuality: (level: EngineQualityLevel, dsrScale?: number) => void;
  updateUniforms: (input: BlackHoleUniformInput) => void;
  resize: (width: number, height: number) => void;
  renderSingleFrame: () => void;
  dispose: () => void;
}

function toShaderVariant(level: EngineQualityLevel): BlackHoleShaderVariant {
  if (level === 'ultra') return 'ultra';
  if (level === 'high') return 'high';
  return 'medium';
}

export function createBlackHoleEngine(
  options: BlackHoleEngineOptions
): BlackHoleEngineController {
  const { container, frontOverlayContainer, isSoftwareGl } = options;
  let quality: EngineQualityLevel = options.initialQuality;
  let shaderVariant: BlackHoleShaderVariant = toShaderVariant(quality);
  let dsrScale = performanceGovernor.getDsrScale();
  let state: BlackHoleOperationalState = 'rest';
  let disposed = false;
  let firstFrameDone = false;
  let rafId = 0;
  let afterDrawTimer = 0;

  let cssWidth = Math.max(2, container.clientWidth || 600);
  let cssHeight = Math.max(2, container.clientHeight || 454);

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  trackWebglContextChange(1);

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  container.appendChild(canvas);

  let frontCanvas: HTMLCanvasElement | null = null;
  let frontBitmapCtx: ImageBitmapRenderingContext | null = null;
  let frontCtx2d: CanvasRenderingContext2D | null = null;

  const ensureFrontCanvas = (needed: boolean) => {
    if (!frontOverlayContainer) return;
    if (!needed) {
      if (frontCanvas && frontCanvas.parentNode === frontOverlayContainer) {
        frontOverlayContainer.removeChild(frontCanvas);
      }
      frontCanvas = null;
      frontBitmapCtx = null;
      frontCtx2d = null;
      return;
    }
    if (frontCanvas) return;

    frontCanvas = document.createElement('canvas');
    frontCanvas.style.width = '100%';
    frontCanvas.style.height = '100%';
    frontCanvas.style.display = 'block';
    frontCanvas.style.pointerEvents = 'none';
    frontOverlayContainer.appendChild(frontCanvas);

    if (typeof (canvas as CanvasWithTransferToBitmap).transferToImageBitmap === 'function') {
      frontBitmapCtx = frontCanvas.getContext('bitmaprenderer');
    }
    if (!frontBitmapCtx) {
      frontCtx2d = frontCanvas.getContext('2d', { alpha: true });
    }
  };

  ensureFrontCanvas(shaderVariant === 'ultra');

  // Pré-computa DataTexture 256x256 tileable uma única vez para substituir fbm() procedural no shader
  const lutData = createNoiseLutBuffer(256);
  const noiseLutTexture = new DataTexture(lutData, 256, 256, RGBAFormat, UnsignedByteType);
  noiseLutTexture.wrapS = RepeatWrapping;
  noiseLutTexture.wrapT = RepeatWrapping;
  noiseLutTexture.minFilter = LinearFilter;
  noiseLutTexture.magFilter = LinearFilter;
  noiseLutTexture.needsUpdate = true;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const resolutionVec = new Vector2(1, 1);
  const pointerVec = new Vector2(0, 0);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: resolutionVec },
    uProgress: { value: 0 },
    uHorizonRadius: { value: 0.48 },
    uWarp: { value: 0.25 },
    uPointer: { value: pointerVec },
    uLightMode: { value: options.lightMode ? 1 : 0 },
    uComplexity: {
      value: quality === 'ultra' ? 1 : quality === 'high' ? 0.85 : 0.52,
    },
    uLayerPass: { value: shaderVariant === 'ultra' ? 0 : -1 },
    uNoiseLut: { value: noiseLutTexture },
  };

  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    vertexShader: BLACKHOLE_VERTEX_SHADER,
    fragmentShader: createBlackHoleFragmentShader(shaderVariant),
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const getActiveRenderMode = (): ActiveRenderMode => {
    if (state === 'inactive') return 'suspended';
    if (shaderVariant === 'ultra') {
      return frontBitmapCtx ? 'webgl-2pass-bitmap' : 'webgl-2pass-copy';
    }
    return 'webgl-1pass-hybrid';
  };

  const applySize = (width: number, height: number) => {
    cssWidth = Math.max(2, Math.floor(width));
    cssHeight = Math.max(2, Math.floor(height));
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const scaled = computeScaledCanvasDimensions({
      cssWidth,
      cssHeight,
      deviceDpr: isSoftwareGl ? Math.min(deviceDpr, 0.85) : deviceDpr,
      level: quality,
      isMobile,
      dsrScale,
    });

    if (scaled.width <= 0 || scaled.height <= 0) return;

    renderer.setPixelRatio(1);
    renderer.setSize(scaled.width, scaled.height, false);
    resolutionVec.set(scaled.width, scaled.height);

    if (frontCanvas) {
      frontCanvas.width = scaled.width;
      frontCanvas.height = scaled.height;
    }

    reportEngineTelemetry({
      activeRenderMode: getActiveRenderMode(),
      canvasWidthPx: scaled.width,
      canvasHeightPx: scaled.height,
      canvasPixelCount: scaled.pixelCount,
    });
  };

  applySize(cssWidth, cssHeight);

  const rawGl = renderer.getContext();
  const isGl2 =
    typeof WebGL2RenderingContext !== 'undefined' &&
    rawGl instanceof WebGL2RenderingContext;
  const gpuTimerExt = isGl2
    ? (rawGl.getExtension('EXT_disjoint_timer_query_webgl2') as DisjointTimerQueryExt | null)
    : null;
  let pendingGpuQuery: WebGLQuery | null = null;

  const pollGpuTimer = () => {
    if (!gpuTimerExt || !isGl2 || !pendingGpuQuery) return;
    const gl2 = rawGl as WebGL2RenderingContext;
    const available = gl2.getQueryParameter(pendingGpuQuery, gl2.QUERY_RESULT_AVAILABLE);
    const disjoint = gl2.getParameter(gpuTimerExt.GPU_DISJOINT_EXT);
    if (available && !disjoint) {
      const elapsedNs = Number(gl2.getQueryParameter(pendingGpuQuery, gl2.QUERY_RESULT) || 0);
      reportEngineTelemetry({ gpuFrameTimeMs: elapsedNs / 1_000_000 });
      gl2.deleteQuery(pendingGpuQuery);
      pendingGpuQuery = null;
    } else if (disjoint) {
      gl2.deleteQuery(pendingGpuQuery);
      pendingGpuQuery = null;
    }
  };

  const afterSoftwareDraw = (done: () => void) => {
    if (disposed || !isGl2) return;
    const gl2 = rawGl as WebGL2RenderingContext;
    const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      afterDrawTimer = window.setTimeout(done, 48);
      return;
    }
    const deadline = performance.now() + 80;
    const poll = () => {
      if (disposed) {
        gl2.deleteSync(sync);
        return;
      }
      const status = gl2.clientWaitSync(sync, 0, 0);
      if (
        status === gl2.ALREADY_SIGNALED ||
        status === gl2.CONDITION_SATISFIED ||
        performance.now() >= deadline
      ) {
        gl2.deleteSync(sync);
        done();
        return;
      }
      afterDrawTimer = window.setTimeout(poll, 16);
    };
    afterDrawTimer = window.setTimeout(poll, 16);
  };

  const WEBGL_TASK_ID = 'blackhole-webgl-render';
  let lastTimestamp = performance.now();
  let elapsedSim = 0;

  const renderFrame = (now: number) => {
    if (disposed) return;

    const rawDtMs = Math.max(0.5, now - lastTimestamp);
    lastTimestamp = now;
    const dtSec = Math.min(0.1, rawDtMs / 1000);

    const speed = state === 'traversal' ? 1.55 : 0.65;
    elapsedSim += dtSec * speed;
    uniforms.uTime.value = elapsedSim;

    pollGpuTimer();
    let startedQueryThisFrame = false;
    if (gpuTimerExt && isGl2 && !pendingGpuQuery) {
      const gl2 = rawGl as WebGL2RenderingContext;
      const q = gl2.createQuery();
      if (q) {
        gl2.beginQuery(gpuTimerExt.TIME_ELAPSED_EXT, q);
        pendingGpuQuery = q;
        startedQueryThisFrame = true;
      }
    }

    if (shaderVariant === 'ultra' && frontCanvas) {
      uniforms.uLayerPass.value = 1;
      renderer.render(scene, camera);

      const canvasWithBitmap = canvas as CanvasWithTransferToBitmap;
      if (frontBitmapCtx && typeof canvasWithBitmap.transferToImageBitmap === 'function') {
        const bitmap = canvasWithBitmap.transferToImageBitmap();
        frontBitmapCtx.transferFromImageBitmap(bitmap);
      } else if (frontCtx2d) {
        frontCtx2d.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
        frontCtx2d.drawImage(canvas, 0, 0);
      }

      uniforms.uLayerPass.value = 0;
      renderer.render(scene, camera);
    } else {
      // Passagem única no GPU: horizonte + disco traseiro (camada frontal vem do layer híbrido sem drawImage)
      uniforms.uLayerPass.value = 0;
      renderer.render(scene, camera);
    }

    if (startedQueryThisFrame && gpuTimerExt && isGl2) {
      (rawGl as WebGL2RenderingContext).endQuery(gpuTimerExt.TIME_ELAPSED_EXT);
    }

    if (!firstFrameDone) {
      firstFrameDone = true;
      options.onFirstFrame?.();
    }
  };

  const scheduleNext = () => {
    if (disposed || state === 'inactive') return;
    if (isSoftwareGl) {
      afterSoftwareDraw(() => {
        if (disposed || state === 'inactive') return;
        const now = performance.now();
        const dt = Math.max(0.5, now - lastTimestamp);
        renderFrame(now);
        performanceGovernor.recordFrame(
          dt,
          now,
          typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
        );
        scheduleNext();
      });
      return;
    }

    frameScheduler.scheduleTask(WEBGL_TASK_ID, (nowMs) => {
      if (disposed || state === 'inactive') return false;
      renderFrame(nowMs);
      return true;
    });
  };

  const stopLoop = () => {
    frameScheduler.stopTask(WEBGL_TASK_ID);
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (afterDrawTimer) {
      window.clearTimeout(afterDrawTimer);
      afterDrawTimer = 0;
    }
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    stopLoop();
    trackWebglContextChange(-1);
    reportEngineTelemetry({ activeRenderMode: 'suspended' });
    options.onContextLoss?.();
  };

  const handleContextRestored = () => {
    trackWebglContextChange(1);
    options.onContextRestored?.();
    lastTimestamp = performance.now();
    renderFrame(lastTimestamp);
    if (state !== 'inactive') {
      scheduleNext();
    }
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

  return {
    setState(nextState) {
      if (disposed || nextState === state) return;
      const wasInactive = state === 'inactive';
      state = nextState;
      reportEngineTelemetry({ activeRenderMode: getActiveRenderMode() });

      if (nextState === 'inactive') {
        stopLoop();
        return;
      }
      if (wasInactive) {
        lastTimestamp = performance.now();
        renderFrame(lastTimestamp);
        scheduleNext();
      }
    },
    setQuality(nextLevel, nextDsr) {
      if (disposed) return;
      const resolvedDsr = typeof nextDsr === 'number' ? nextDsr : performanceGovernor.getDsrScale();
      const qualityChanged = nextLevel !== quality;
      const dsrChanged = Math.abs(resolvedDsr - dsrScale) > 0.01;
      if (!qualityChanged && !dsrChanged) return;

      quality = nextLevel;
      dsrScale = resolvedDsr;

      if (quality === 'low' || quality === 'emergency') {
        stopLoop();
        return;
      }

      const nextVariant = toShaderVariant(quality);
      if (nextVariant !== shaderVariant) {
        shaderVariant = nextVariant;
        ensureFrontCanvas(shaderVariant === 'ultra');
        material.fragmentShader = createBlackHoleFragmentShader(shaderVariant);
        material.needsUpdate = true;
      }

      uniforms.uComplexity.value =
        quality === 'ultra' ? 1 : quality === 'high' ? 0.85 : 0.52;
      applySize(cssWidth, cssHeight);
      options.onQualityChange?.(quality);
    },
    updateUniforms(input) {
      if (disposed) return;
      if (typeof input.progress === 'number') {
        uniforms.uProgress.value = input.progress;
      }
      if (typeof input.horizonRadius === 'number') {
        uniforms.uHorizonRadius.value = input.horizonRadius;
      }
      if (typeof input.warp === 'number') {
        uniforms.uWarp.value = input.warp;
      }
      if (typeof input.pointerX === 'number' && typeof input.pointerY === 'number') {
        pointerVec.set(input.pointerX, input.pointerY);
      }
      if (typeof input.lightMode === 'boolean') {
        uniforms.uLightMode.value = input.lightMode ? 1 : 0;
      }
    },
    resize(width, height) {
      if (disposed) return;
      applySize(width, height);
    },
    renderSingleFrame() {
      if (disposed) return;
      renderFrame(performance.now());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopLoop();
      frameScheduler.removeTask(WEBGL_TASK_ID);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      if (pendingGpuQuery && isGl2) {
        (rawGl as WebGL2RenderingContext).deleteQuery(pendingGpuQuery);
        pendingGpuQuery = null;
      }

      noiseLutTexture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      trackWebglContextChange(-1);
      reportEngineTelemetry({
        activeRenderMode: 'suspended',
        canvasWidthPx: 0,
        canvasHeightPx: 0,
        canvasPixelCount: 0,
        gpuFrameTimeMs: null,
      });

      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
      if (frontCanvas && frontOverlayContainer && frontCanvas.parentNode === frontOverlayContainer) {
        frontOverlayContainer.removeChild(frontCanvas);
      }
    },
  };
}
