import * as THREE from 'three';
import type {
  BlackHoleOperationalState,
  BlackHoleQualityTier,
} from '../../motion/gravitationalTimeline';
import {
  BLACKHOLE_FRAGMENT_SHADER,
  BLACKHOLE_VERTEX_SHADER,
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

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !isSoftwareGl && quality === 'high',
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  container.appendChild(canvas);

  let frontCanvas: HTMLCanvasElement | null = null;
  let frontCtx: CanvasRenderingContext2D | null = null;
  if (frontOverlayContainer) {
    frontCanvas = document.createElement('canvas');
    frontCanvas.style.width = '100%';
    frontCanvas.style.height = '100%';
    frontCanvas.style.display = 'block';
    frontCanvas.style.pointerEvents = 'none';
    frontOverlayContainer.appendChild(frontCanvas);
    frontCtx = frontCanvas.getContext('2d', { alpha: true });
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const resolutionVec = new THREE.Vector2(1, 1);
  const pointerVec = new THREE.Vector2(0, 0);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: resolutionVec },
    uProgress: { value: 0 },
    uHorizonRadius: { value: 0.48 },
    uWarp: { value: 0.25 },
    uPointer: { value: pointerVec },
    uLightMode: { value: options.lightMode ? 1 : 0 },
    uComplexity: {
      value: quality === 'high' ? 1 : quality === 'medium' ? 0.72 : 0.48,
    },
    uLayerPass: { value: frontCtx ? 0 : -1 },
  };

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: BLACKHOLE_VERTEX_SHADER,
    fragmentShader: BLACKHOLE_FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const applySize = (width: number, height: number) => {
    const safeW = Math.max(2, Math.floor(width));
    const safeH = Math.max(2, Math.floor(height));
    const dprCap = isSoftwareGl
      ? 1
      : quality === 'high'
        ? 1.75
        : quality === 'medium'
          ? 1.35
          : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(safeW, safeH, false);
    resolutionVec.set(safeW * dpr, safeH * dpr);
    if (frontCanvas) {
      frontCanvas.width = canvas.width;
      frontCanvas.height = canvas.height;
    }
  };

  const rect = container.getBoundingClientRect();
  applySize(rect.width || 600, rect.height || 600);

  const rawGl = renderer.getContext();

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
  let slowFrameAccumulator = 0;
  let slowFrameCount = 0;
  let elapsedSim = 0;

  const renderFrame = (now: number) => {
    if (disposed) return;

    const dt = Math.min(0.1, Math.max(0.001, (now - lastTimestamp) / 1000));
    lastTimestamp = now;

    // Velocidade adaptativa conforme estado operacional (repouso vs travessia)
    const speed = state === 'traversal' ? 1.55 : 0.65;
    elapsedSim += dt * speed;
    uniforms.uTime.value = elapsedSim;

    if (frontCanvas && frontCtx) {
      // Passagem 1: matéria orbital frontal isolada -> transferida ao canvas frontal (z-30)
      uniforms.uLayerPass.value = 1;
      renderer.render(scene, camera);
      frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
      frontCtx.drawImage(canvas, 0, 0);

      // Passagem 2: horizonte de eventos e matéria posterior -> mantida no canvas principal (z-0)
      uniforms.uLayerPass.value = 0;
      renderer.render(scene, camera);
    } else {
      uniforms.uLayerPass.value = -1;
      renderer.render(scene, camera);
    }

    if (!firstFrameDone) {
      firstFrameDone = true;
      options.onFirstFrame?.();
    }

    // Monitoramento adaptativo gradual de FPS (high -> medium -> low), ignorando picos isolados de hidratação
    if (!isSoftwareGl && quality !== 'low' && state !== 'inactive') {
      const targetDt = quality === 'high' ? 1 / 28 : 1 / 20;
      if (dt > targetDt && dt < 0.095) {
        slowFrameCount += 1;
        slowFrameAccumulator += dt;
        if (slowFrameCount >= 28 && slowFrameAccumulator / slowFrameCount > targetDt) {
          const nextTier: BlackHoleQualityTier = quality === 'high' ? 'medium' : 'low';
          quality = nextTier;
          uniforms.uComplexity.value = nextTier === 'medium' ? 0.72 : 0.48;
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
      renderFrame(performance.now());
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

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    stopLoop();
    options.onContextLoss?.();
  };

  const handleContextRestored = () => {
    options.onContextRestored?.();
    lastTimestamp = performance.now();
    renderFrame(lastTimestamp);
    if (state !== 'inactive') {
      scheduleNext();
    }
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

  // Renderiza o primeiro frame imediatamente e inicia o loop contínuo
  renderFrame(lastTimestamp);
  scheduleNext();

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
      uniforms.uComplexity.value =
        quality === 'high' ? 1 : quality === 'medium' ? 0.72 : 0.48;
      const r = container.getBoundingClientRect();
      applySize(r.width || 600, r.height || 600);
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
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
      if (frontCanvas && frontOverlayContainer && frontCanvas.parentNode === frontOverlayContainer) {
        frontOverlayContainer.removeChild(frontCanvas);
      }
    },
  };
}
