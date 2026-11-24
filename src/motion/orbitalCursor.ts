/**
 * Lógica pura e testável do cursor orbital minimalista Limiar.
 * Separa classificação de alvos interativos/editáveis e interpolação temporal
 * do ciclo RAF/DOM.
 */

export type OrbitalCursorMode = 'default' | 'interactive' | 'text';

export const ORBITAL_CURSOR_LERP_RATE = 0.2;
export const ORBITAL_CURSOR_CLICK_PULSE_MS = 135;

const TEXT_INPUT_TYPES = new Set([
  '',
  'text',
  'email',
  'search',
  'password',
  'url',
  'tel',
  'number',
]);

const INTERACTIVE_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'submit',
  'button',
  'reset',
  'range',
  'file',
  'color',
]);

export function computeFrameIndependentLerp(
  current: number,
  target: number,
  ratePerFrame: number,
  dtMs: number
): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return target;
  const safeDt = Math.max(0, Math.min(64, dtMs));
  const factor = 1 - Math.pow(1 - Math.min(1, Math.max(0, ratePerFrame)), safeDt / 16.6667);
  const next = current + (target - current) * factor;
  if (Math.abs(target - next) < 0.05) {
    return target;
  }
  return next;
}

function toElement(target: EventTarget | null): Element | null {
  if (!target || typeof target !== 'object') return null;
  if ('nodeType' in target) {
    const node = target as Node;
    if (node.nodeType === 1) return node as Element;
    return node.parentElement;
  }
  return null;
}

export function isTextEditableElement(element: Element | null): boolean {
  if (!element) return false;
  const editable = element.closest(
    'textarea, input, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
  );
  if (!editable) return false;

  if (editable.tagName === 'TEXTAREA') {
    return !(editable as HTMLTextAreaElement).disabled && !(editable as HTMLTextAreaElement).readOnly;
  }

  if (editable.tagName === 'INPUT') {
    const input = editable as HTMLInputElement;
    if (input.disabled) return false;
    const type = (input.getAttribute('type') || '').toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }

  return editable.getAttribute('contenteditable') !== 'false';
}

export function isInteractiveCursorElement(element: Element | null): boolean {
  if (!element) return false;

  const candidate = element.closest(
    'a[href], button, select, summary, label[for], input, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="switch"], [data-cursor="interactive"], [class*="cursor-pointer"], [tabindex]'
  );

  if (!candidate) return false;

  if (candidate.closest('[aria-disabled="true"]')) return false;
  if ('disabled' in candidate && Boolean((candidate as HTMLButtonElement).disabled)) {
    return false;
  }

  if (candidate.tagName === 'INPUT') {
    const type = (candidate.getAttribute('type') || '').toLowerCase();
    return INTERACTIVE_INPUT_TYPES.has(type);
  }

  if (candidate.hasAttribute('tabindex') && candidate.getAttribute('tabindex') === '-1') {
    // Só considera tabindex="-1" se também for explicitamente interativo por classe/atributo
    const explicit = candidate.matches(
      'a[href], button, select, summary, label[for], [role="button"], [role="link"], [data-cursor="interactive"], [class*="cursor-pointer"]'
    );
    return explicit;
  }

  return true;
}

export function classifyCursorTarget(target: EventTarget | null): OrbitalCursorMode {
  const element = toElement(target);
  if (!element) return 'default';

  if (isTextEditableElement(element)) {
    return 'text';
  }

  if (isInteractiveCursorElement(element)) {
    return 'interactive';
  }

  return 'default';
}
