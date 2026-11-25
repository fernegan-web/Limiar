import React, { useEffect, useRef } from 'react';
import {
  ORBITAL_CURSOR_CLICK_PULSE_MS,
  ORBITAL_CURSOR_LERP_RATE,
  type OrbitalCursorMode,
  classifyCursorTarget,
  computeFrameIndependentLerp,
} from '../../motion/orbitalCursor';

const ACTIVE_CLASS = 'limiar-custom-cursor';

/**
 * Cursor personalizado orbital minimalista:
 * - Ponto central preciso posicionado na coordenada real do clique/ponteiro.
 * - Anel externo fino com interpolação suave e leve atraso via requestAnimationFrame.
 * - Zero re-renderizações React contínuas: atualizações diretas via DOM/CSS.
 * - Oculta o cursor nativo somente após confirmar ponteiro fino ativo e ciclo RAF operante.
 * - Desativa automaticamente em dispositivos touch.
 */
export function OrbitalCursor() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rootEl = rootRef.current;
    const dotEl = dotRef.current;
    const ringEl = ringRef.current;
    if (!rootEl || !dotEl || !ringEl) return;

    const finePointerMql = window.matchMedia('(pointer: fine)');
    const hoverNoneMql = window.matchMedia('(hover: none)');

    const isEligible = () => finePointerMql.matches && !hoverNoneMql.matches;

    let rafId = 0;
    let lastTime = 0;
    let clickTimeoutId = 0;
    let pointerActive = false;
    let initialized = false;
    let currentMode: OrbitalCursorMode = 'default';

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;

    const setNativeCursorHidden = (hidden: boolean) => {
      if (hidden) {
        document.documentElement.classList.add(ACTIVE_CLASS);
      } else {
        document.documentElement.classList.remove(ACTIVE_CLASS);
      }
    };

    const deactivate = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (clickTimeoutId) {
        window.clearTimeout(clickTimeoutId);
        clickTimeoutId = 0;
      }
      pointerActive = false;
      initialized = false;
      currentMode = 'default';
      rootEl.setAttribute('data-cursor-visible', 'false');
      rootEl.setAttribute('data-cursor-mode', 'default');
      rootEl.setAttribute('data-cursor-pressed', 'false');
      setNativeCursorHidden(false);
    };

    const applyDotTransform = (x: number, y: number) => {
      dotEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const applyRingTransform = (x: number, y: number) => {
      ringEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const tick = (now: number) => {
      if (!pointerActive || !isEligible()) {
        deactivate();
        return;
      }

      const dt = lastTime > 0 ? now - lastTime : 16.6667;
      lastTime = now;

      ringX = computeFrameIndependentLerp(ringX, targetX, ORBITAL_CURSOR_LERP_RATE, dt);
      ringY = computeFrameIndependentLerp(ringY, targetY, ORBITAL_CURSOR_LERP_RATE, dt);
      applyRingTransform(ringX, ringY);

      if (ringX !== targetX || ringY !== targetY) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
        lastTime = 0;
      }
    };

    const ensureLoopRunning = () => {
      if (!rafId && pointerActive) {
        lastTime = 0;
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const updateTargetMode = (target: EventTarget | null) => {
      const nextMode = classifyCursorTarget(target);
      if (nextMode !== currentMode) {
        currentMode = nextMode;
        rootEl.setAttribute('data-cursor-mode', nextMode);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !isEligible()) {
        deactivate();
        return;
      }

      targetX = e.clientX;
      targetY = e.clientY;

      if (!initialized) {
        initialized = true;
        ringX = targetX;
        ringY = targetY;
        applyRingTransform(ringX, ringY);
      }

      pointerActive = true;
      applyDotTransform(targetX, targetY);
      updateTargetMode(e.target);
      rootEl.setAttribute('data-cursor-visible', 'true');
      setNativeCursorHidden(true);
      ensureLoopRunning();
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (!pointerActive || e.pointerType === 'touch') return;
      updateTargetMode(e.target);
    };

    let pressedUntil = 0;

    const releasePressed = () => {
      if (clickTimeoutId) {
        window.clearTimeout(clickTimeoutId);
        clickTimeoutId = 0;
      }
      rootEl.setAttribute('data-cursor-pressed', 'false');
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !isEligible()) {
        deactivate();
        return;
      }
      if (!pointerActive) return;

      targetX = e.clientX;
      targetY = e.clientY;
      applyDotTransform(targetX, targetY);
      updateTargetMode(e.target);

      if (clickTimeoutId) {
        window.clearTimeout(clickTimeoutId);
        clickTimeoutId = 0;
      }
      pressedUntil = performance.now() + ORBITAL_CURSOR_CLICK_PULSE_MS;
      rootEl.setAttribute('data-cursor-pressed', 'true');
      clickTimeoutId = window.setTimeout(releasePressed, ORBITAL_CURSOR_CLICK_PULSE_MS);
    };

    const handlePointerUp = () => {
      if (!pointerActive) return;
      const remaining = pressedUntil - performance.now();
      if (remaining > 8) {
        if (clickTimeoutId) {
          window.clearTimeout(clickTimeoutId);
        }
        clickTimeoutId = window.setTimeout(releasePressed, remaining);
      } else {
        releasePressed();
      }
    };

    const handleTouchStart = () => {
      deactivate();
    };

    const handleMouseLeave = () => {
      deactivate();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) deactivate();
    };

    const handleCapabilityChange = () => {
      if (!isEligible()) deactivate();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerover', handlePointerOver, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('blur', handleMouseLeave);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    finePointerMql.addEventListener?.('change', handleCapabilityChange);

    if (!isEligible()) {
      deactivate();
    }

    return () => {
      deactivate();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerover', handlePointerOver);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('blur', handleMouseLeave);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      finePointerMql.removeEventListener?.('change', handleCapabilityChange);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-orbital-cursor="true"
      data-cursor-visible="false"
      data-cursor-mode="default"
      data-cursor-pressed="false"
      className="limiar-orbital-root"
    >
      <div ref={ringRef} className="limiar-orbital-ring">
        <div className="limiar-orbital-ring-shape" />
      </div>
      <div ref={dotRef} className="limiar-orbital-dot">
        <div className="limiar-orbital-dot-core" />
      </div>
    </div>
  );
}
