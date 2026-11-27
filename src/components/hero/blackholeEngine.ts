import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';
import type { BlackHoleOperationalState } from '../../motion/gravitationalTimeline';
import {
  BLACKHOLE_FRAGMENT_SHADER,
  BLACKHOLE_VERTEX_SHADER,
} from './blackholeShader';

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
  lightMode: boolean;
  onFirstFrame?: () => void;
  onContextLoss?: () => void;
  onContextRestored?: () => void;
}

export interface BlackHoleEngineController {
  setState: (state: BlackHoleOperationalState) => void;
  updateUniforms: (input: BlackHoleUniformInput) => void;
  resize: (width: number, height: number) => void;
  renderSingleFrame: () => void;
  dispose: () => void;
}

type CanvasWithTransferToBitmap = HTMLCanvasElement & {
  transferToImageBitmap?: () => ImageBitmap;
};

export function createBlackHoleEngine(
  options: BlackHoleEngineOptions
): BlackHoleEngineController {
  const { container, frontOverlayContainer } = options;
  let state: BlackHoleOperationalState = 'rest';
  let disposed = false;
  let firstFrameDone = false;
  let rafId = 0;

  let cssWidth = Math.max(2, container.clientWidth || 600);
  let cssHeight = Math.max(2, container.clientHeight || 454);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
  } catch (err) {
    console.error('[Limiar BlackHole] Falha ao criar WebGLRenderer:', err);
    throw err;
  }

  const gl = renderer.getContext();
  if (!gl) {
    const err = new Error('Contexto WebGL indisponível após criação do WebGLRenderer.');
    console.error('[Limiar BlackHole]', err);
    renderer.dispose();
    throw err;
  }

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

  if (frontOverlayContainer) {
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
      if (!frontCtx2d) {
        console.warn(
          '[Limiar BlackHole] Contexto 2D indisponível na camada orbital frontal; renderizando passagem única.'
        );
      }
    }
  }

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const resolutionVec = new Vector2(1, 1);
  const pointerVec = new Vector2(0, 0);

  const hasTwoPassLayer = Boolean(frontCanvas && (frontBitmapCtx || frontCtx2d));

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: resolutionVec },
    uProgress: { value: 0 },
    uHorizonRadius: { value: 0.48 },
    uWarp: { value: 0.25 },
    uPointer: { value: pointerVec },
    uLightMode: { value: options.lightMode ? 1 : 0 },
    uComplexity: { value: 1 },
    uLayerPass: { value: hasTwoPassLayer ? 0 : -1 },
  };

  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    vertexShader: BLACKHOLE_VERTEX_SHADER,
    fragmentShader: BLACKHOLE_FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const applySize = (width: number, height: number) => {
    cssWidth = Math.max(2, Math.floor(width));
    cssHeight = Math.max(2, Math.floor(height));
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    renderer.setPixelRatio(dpr);
    renderer.setSize(cssWidth, cssHeight, false);

    const drawingW = Math.max(2, Math.round(cssWidth * dpr));
    const drawingH = Math.max(2, Math.round(cssHeight * dpr));
    resolutionVec.set(drawingW, drawingH);

    if (frontCanvas) {
      frontCanvas.width = drawingW;
      frontCanvas.height = drawingH;
    }
  };

  applySize(cssWidth, cssHeight);

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

    if (frontCanvas && (frontBitmapCtx || frontCtx2d)) {
      // Passagem 1: matéria orbital frontal (acima da modelo)
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

      // Passagem 2: disco de acreção traseiro + horizonte preto (atrás da modelo)
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
  };

  const stopLoop = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const tick = (now: number) => {
    if (disposed || state === 'inactive') {
      rafId = 0;
      return;
    }
    renderFrame(now);
    rafId = window.requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (disposed || state === 'inactive' || rafId !== 0) return;
    lastTimestamp = performance.now();
    rafId = window.requestAnimationFrame(tick);
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    stopLoop();
    console.warn('[Limiar BlackHole] Contexto WebGL perdido (webglcontextlost).');
    options.onContextLoss?.();
  };

  const handleContextRestored = () => {
    console.info('[Limiar BlackHole] Contexto WebGL restaurado (webglcontextrestored).');
    options.onContextRestored?.();
    lastTimestamp = performance.now();
    renderFrame(lastTimestamp);
    if (state !== 'inactive') {
      startLoop();
    }
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

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
        startLoop();
      }
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
      if (disposed || width < 2 || height < 2) return;
      applySize(width, height);
      renderFrame(performance.now());
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
      if (
        frontCanvas &&
        frontOverlayContainer &&
        frontCanvas.parentNode === frontOverlayContainer
      ) {
        frontOverlayContainer.removeChild(frontCanvas);
      }
    },
  };
}
