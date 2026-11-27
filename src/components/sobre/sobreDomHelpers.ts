import type { ElementVisualState } from '../../motion/sobreTimeline';

/**
 * Aplica estado visual diretamente ao nó DOM sem provocar re-renders React.
 * Quando em repouso completo (opacity === 1, sem deslocamentos ou blur), limpa
 * transform/filter para preservar nitidez máxima da tipografia e fotografias.
 */
export function applyVisualState(
  node: HTMLElement | null,
  state: ElementVisualState,
  options?: {
    clipPath?: string;
    extraY?: number;
    allowPointer?: boolean;
  }
): void {
  if (!node) return;
  const effectiveBlur = state.blurPx;
  const totalY = state.y + (options?.extraY ?? 0);
  const isAtRest =
    state.opacity >= 0.999 &&
    Math.abs(state.x) < 0.05 &&
    Math.abs(totalY) < 0.05 &&
    Math.abs(state.scale - 1) < 0.001 &&
    effectiveBlur < 0.1 &&
    !options?.clipPath;

  node.style.opacity = state.opacity <= 0.001 ? '0' : String(state.opacity);
  node.style.visibility = state.opacity <= 0.001 ? 'hidden' : 'visible';

  if (options?.allowPointer !== undefined) {
    node.style.pointerEvents = options.allowPointer && state.opacity > 0.15 ? 'auto' : 'none';
  }

  if (isAtRest) {
    node.style.transform = 'none';
    node.style.filter = 'none';
    node.style.clipPath = 'none';
    node.style.willChange = 'auto';
    return;
  }

  node.style.willChange = state.opacity > 0.001 ? 'transform, opacity' : 'auto';
  node.style.transform = `translate3d(${state.x.toFixed(2)}px, ${totalY.toFixed(2)}px, 0) scale(${state.scale.toFixed(4)})`;
  node.style.filter = effectiveBlur > 0.1 ? `blur(${effectiveBlur.toFixed(2)}px)` : 'none';
  if (options?.clipPath !== undefined) {
    node.style.clipPath = options.clipPath;
  }
}

export function resetVisualState(node: HTMLElement | null, interactive = true): void {
  if (!node) return;
  node.style.opacity = '1';
  node.style.visibility = 'visible';
  node.style.transform = 'none';
  node.style.filter = 'none';
  node.style.clipPath = 'none';
  node.style.willChange = 'auto';
  if (interactive) {
    node.style.pointerEvents = 'auto';
  }
}
