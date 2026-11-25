import type {
  BlackHoleOperationalState,
  BlackHoleQualityTier,
} from '../../motion/gravitationalTimeline';
import {
  BLACKHOLE_FRONT_VERTEX_SHADER,
  buildBlackHoleFragmentShader,
} from './blackholeShader';

export interface WebglCapabilityProbe {
  supported: boolean;
  isSoftwareGl: boolean;
}

export function probeWebglCapability(): WebglCapabilityProbe {
  if (typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: false };
  }
  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) {
      return { supported: false, isSoftwareGl: false };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '')
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Microsoft Basic Render/i.test(
      renderer
    );

    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: false };
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
  initialQuality: BlackHoleQualityTier;
  isSoftwareGl: boolean;
  lightMode: boolean;
  onFirstFrame?: () => void;
  onQualityDowngrade?: (tier: BlackHoleQualityTier) => void;
  onContextLoss?: () => void;
  onContextRestored?: () => void;
}

export interface BlackHoleEngineController {
  setState: (state: BlackHoleOperationalState) => void;
  setQuality: (tier: BlackHoleQualityTier) => void;
  updateUniforms: (input: BlackHoleUniformInput) => void;
  resize: (width: number, height: number) => void;
  renderSingleFrame: () => void;
  dispose: () => void;
}

interface UniformState {
  time: number;
  resX: number;
  resY: number;
  progress: number;
  horizonRadius: number;
  warp: number;
  pointerX: number;
  pointerY: number;
  lightMode: number;
  complexity: number;
}

interface QuadWebGLRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  resize: (pixelWidth: number, pixelHeight: number) => void;
  markStaticDirty: () => void;
  render: (u: UniformState) => void;
  dispose: () => void;
}

const QUAD_VERTICES = new Float32Array([
  -1, -1, 0, 0,
   1, -1, 1, 0,
  -1,  1, 0, 1,
   1,  1, 1, 1,
]);

function createQuadWebGLRenderer(
  host: HTMLElement,
  layerPass: -1 | 0 | 1,
  callbacks?: {
    onContextLoss?: () => void;
    onContextRestored?: () => void;
  }
): QuadWebGLRenderer | null {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';

  const ctxAttrs: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  };

  const gl =
    (canvas.getContext('webgl2', ctxAttrs) as WebGL2RenderingContext | null) ||
    (canvas.getContext('webgl', ctxAttrs) as WebGLRenderingContext | null);

  if (!gl) {
    return null;
  }

  const fragmentSource = buildBlackHoleFragmentShader(layerPass);

  let program: WebGLProgram | null = null;
  let vbo: WebGLBuffer | null = null;
  let uTimeLoc: WebGLUniformLocation | null = null;
  let uResolutionLoc: WebGLUniformLocation | null = null;
  let uProgressLoc: WebGLUniformLocation | null = null;
  let uHorizonRadiusLoc: WebGLUniformLocation | null = null;
  let uWarpLoc: WebGLUniformLocation | null = null;
  let uPointerLoc: WebGLUniformLocation | null = null;
  let uLightModeLoc: WebGLUniformLocation | null = null;
  let uComplexityLoc: WebGLUniformLocation | null = null;
  let staticDirty = true;

  const compile = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const initResources = (): boolean => {
    const vs = compile(gl.VERTEX_SHADER, BLACKHOLE_FRONT_VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return false;
    }

    const nextProgram = gl.createProgram();
    if (!nextProgram) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return false;
    }
    gl.attachShader(nextProgram, vs);
    gl.attachShader(nextProgram, fs);
    gl.linkProgram(nextProgram);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
      gl.deleteProgram(nextProgram);
      return false;
    }

    const nextVbo = gl.createBuffer();
    if (!nextVbo) {
      gl.deleteProgram(nextProgram);
      return false;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, nextVbo);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(nextProgram, 'position');
    const uvLoc = gl.getAttribLocation(nextProgram, 'uv');

    gl.useProgram(nextProgram);
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    }
    if (uvLoc >= 0) {
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);
    }

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
    gl.clearColor(0, 0, 0, 0);

    program = nextProgram;
    vbo = nextVbo;
    uTimeLoc = gl.getUniformLocation(nextProgram, 'uTime');
    uResolutionLoc = gl.getUniformLocation(nextProgram, 'uResolution');
    uProgressLoc = gl.getUniformLocation(nextProgram, 'uProgress');
    uHorizonRadiusLoc = gl.getUniformLocation(nextProgram, 'uHorizonRadius');
    uWarpLoc = gl.getUniformLocation(nextProgram, 'uWarp');
    uPointerLoc = gl.getUniformLocation(nextProgram, 'uPointer');
    uLightModeLoc = gl.getUniformLocation(nextProgram, 'uLightMode');
    uComplexityLoc = gl.getUniformLocation(nextProgram, 'uComplexity');
    staticDirty = true;
    return true;
  };

  if (!initResources()) {
    return null;
  }

  host.appendChild(canvas);

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    callbacks?.onContextLoss?.();
  };

  const handleContextRestored = () => {
    if (initResources()) {
      callbacks?.onContextRestored?.();
    }
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

  return {
    canvas,
    gl,
    resize(pixelWidth, pixelHeight) {
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      staticDirty = true;
    },
    markStaticDirty() {
      staticDirty = true;
    },
    render(u) {
      if (!program || gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      if (uTimeLoc) gl.uniform1f(uTimeLoc, u.time);

      if (staticDirty) {
        if (uResolutionLoc) gl.uniform2f(uResolutionLoc, u.resX, u.resY);
        if (uProgressLoc) gl.uniform1f(uProgressLoc, u.progress);
        if (uHorizonRadiusLoc) gl.uniform1f(uHorizonRadiusLoc, u.horizonRadius);
        if (uWarpLoc) gl.uniform1f(uWarpLoc, u.warp);
        if (uPointerLoc) gl.uniform2f(uPointerLoc, u.pointerX, u.pointerY);
        if (uLightModeLoc) gl.uniform1f(uLightModeLoc, u.lightMode);
        if (uComplexityLoc) gl.uniform1f(uComplexityLoc, u.complexity);
        staticDirty = false;
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      if (vbo) gl.deleteBuffer(vbo);
      if (program) gl.deleteProgram(program);
      program = null;
      vbo = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      if (canvas.parentNode === host) {
        host.removeChild(canvas);
      }
    },
  };
}

export function createBlackHoleEngine(
  options: BlackHoleEngineOptions
): BlackHoleEngineController {
  const { container, frontOverlayContainer, isSoftwareGl } = options;
  let quality: BlackHoleQualityTier = options.initialQuality;
  let state: BlackHoleOperationalState = 'rest';
  let disposed = false;
  let firstFrameDone = false;
  let rafId = 0;
  let afterDrawTimer = 0;

  const frontQuad = frontOverlayContainer
    ? createQuadWebGLRenderer(frontOverlayContainer, 1)
    : null;

  const rearQuad = createQuadWebGLRenderer(container, frontQuad ? 0 : -1, {
    onContextLoss: () => {
      stopLoop();
      options.onContextLoss?.();
    },
    onContextRestored: () => {
      options.onContextRestored?.();
      lastTimestamp = performance.now();
      renderFrame(lastTimestamp);
      if (state !== 'inactive') {
        scheduleNext();
      }
    },
  });

  if (!rearQuad) {
    frontQuad?.dispose();
    throw new Error('WebGL context unavailable');
  }

  const uniformState: UniformState = {
    time: 0,
    resX: 1,
    resY: 1,
    progress: 0,
    horizonRadius: 0.48,
    warp: 0.25,
    pointerX: 0,
    pointerY: 0,
    lightMode: options.lightMode ? 1 : 0,
    complexity: quality === 'high' ? 1 : quality === 'medium' ? 0.72 : 0.48,
  };

  const applySize = (width: number, height: number) => {
    const safeW = Math.max(2, Math.floor(width));
    const safeH = Math.max(2, Math.floor(height));
    const dprCap = isSoftwareGl
      ? 0.9
      : quality === 'high'
        ? 1.35
        : quality === 'medium'
          ? 1.05
          : 0.85;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const pxW = Math.max(2, Math.round(safeW * dpr));
    const pxH = Math.max(2, Math.round(safeH * dpr));
    uniformState.resX = pxW;
    uniformState.resY = pxH;
    rearQuad.resize(pxW, pxH);
    frontQuad?.resize(pxW, pxH);
  };

  const rect = container.getBoundingClientRect();
  applySize(rect.width || 600, rect.height || 600);

  const rawGl = rearQuad.gl;

  const getMinFrameIntervalMs = () => {
    if (state === 'traversal') {
      if (isSoftwareGl) return 28;
      if (quality === 'high') return 0;
      return quality === 'medium' ? 20 : 28;
    }
    if (isSoftwareGl) return 42;
    if (quality === 'high') return 22;
    return quality === 'medium' ? 36 : 45;
  };

  const afterDraw = (done: () => void) => {
    if (disposed) return;
    if (
      isSoftwareGl &&
      typeof WebGL2RenderingContext !== 'undefined' &&
      rawGl instanceof WebGL2RenderingContext
    ) {
      const sync = rawGl.fenceSync(rawGl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        afterDrawTimer = window.setTimeout(done, 48);
        return;
      }
      const deadline = performance.now() + 80;
      const poll = () => {
        if (disposed) {
          rawGl.deleteSync(sync);
          return;
        }
        const status = rawGl.clientWaitSync(sync, 0, 0);
        if (
          status === rawGl.ALREADY_SIGNALED ||
          status === rawGl.CONDITION_SATISFIED ||
          performance.now() >= deadline
        ) {
          rawGl.deleteSync(sync);
          done();
          return;
        }
        afterDrawTimer = window.setTimeout(poll, 16);
      };
      afterDrawTimer = window.setTimeout(poll, 16);
      return;
    }

    rafId = window.requestAnimationFrame(done);
  };

  let lastTimestamp = performance.now();
  let lastRenderClock = lastTimestamp;
  let slowFrameAccumulator = 0;
  let slowFrameCount = 0;
  let elapsedSim = 0;

  const renderFrame = (now: number) => {
    if (disposed) return;

    const dt = Math.min(0.1, Math.max(0.001, (now - lastTimestamp) / 1000));
    lastTimestamp = now;
    lastRenderClock = now;

    // Velocidade adaptativa conforme estado operacional (repouso vs travessia)
    const speed = state === 'traversal' ? 1.55 : 0.65;
    elapsedSim += dt * speed;
    uniformState.time = elapsedSim;

    // Passagem 0: horizonte de eventos e matéria posterior (ou -1 combinado se fallback)
    rearQuad.render(uniformState);

    // Passagem 1 direta em GPU no canvas frontal (zero readback 2D)
    frontQuad?.render(uniformState);

    if (!firstFrameDone) {
      firstFrameDone = true;
      options.onFirstFrame?.();
    }

    // Monitoramento adaptativo gradual de FPS (high -> medium -> low)
    if (!isSoftwareGl && quality !== 'low' && state !== 'inactive') {
      const targetDt = quality === 'high' ? 1 / 24 : 1 / 18;
      if (dt > targetDt && dt < 0.095) {
        slowFrameCount += 1;
        slowFrameAccumulator += dt;
        if (slowFrameCount >= 28 && slowFrameAccumulator / slowFrameCount > targetDt) {
          const nextTier: BlackHoleQualityTier = quality === 'high' ? 'medium' : 'low';
          quality = nextTier;
          uniformState.complexity = nextTier === 'medium' ? 0.72 : 0.48;
          rearQuad.markStaticDirty();
          frontQuad?.markStaticDirty();
          const r = container.getBoundingClientRect();
          applySize(r.width || 600, r.height || 600);
          slowFrameCount = 0;
          slowFrameAccumulator = 0;
          options.onQualityDowngrade?.(nextTier);
        }
      } else if (dt <= targetDt) {
        slowFrameCount = Math.max(0, slowFrameCount - 1);
        slowFrameAccumulator = 0;
      }
    }
  };

  const scheduleNext = () => {
    if (disposed || state === 'inactive') return;
    afterDraw(() => {
      if (disposed || state === 'inactive') return;
      const now = performance.now();
      const minInterval = getMinFrameIntervalMs();
      if (minInterval <= 0 || now - lastRenderClock >= minInterval) {
        renderFrame(now);
      }
      scheduleNext();
    });
  };

  const stopLoop = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (afterDrawTimer) {
      window.clearTimeout(afterDrawTimer);
      afterDrawTimer = 0;
    }
  };

  return {
    setState(nextState) {
      if (disposed || nextState === state) return;
      const wasInactive = state === 'inactive';
      state = nextState;
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
    setQuality(nextTier) {
      if (disposed || nextTier === quality) return;
      quality = nextTier;
      uniformState.complexity =
        quality === 'high' ? 1 : quality === 'medium' ? 0.72 : 0.48;
      rearQuad.markStaticDirty();
      frontQuad?.markStaticDirty();
      const r = container.getBoundingClientRect();
      applySize(r.width || 600, r.height || 600);
    },
    updateUniforms(input) {
      if (disposed) return;
      if (typeof input.progress === 'number') {
        uniformState.progress = input.progress;
      }
      if (typeof input.horizonRadius === 'number') {
        uniformState.horizonRadius = input.horizonRadius;
      }
      if (typeof input.warp === 'number') {
        uniformState.warp = input.warp;
      }
      if (typeof input.pointerX === 'number' && typeof input.pointerY === 'number') {
        uniformState.pointerX = input.pointerX;
        uniformState.pointerY = input.pointerY;
      }
      if (typeof input.lightMode === 'boolean') {
        uniformState.lightMode = input.lightMode ? 1 : 0;
      }
      rearQuad.markStaticDirty();
      frontQuad?.markStaticDirty();
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
      frontQuad?.dispose();
      rearQuad.dispose();
    },
  };
}
