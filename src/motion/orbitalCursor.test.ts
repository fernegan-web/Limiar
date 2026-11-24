import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORBITAL_CURSOR_LERP_RATE,
  classifyCursorTarget,
  computeFrameIndependentLerp,
} from './orbitalCursor';

interface MockElement {
  nodeType: number;
  tagName: string;
  attributes: Record<string, string>;
  disabled?: boolean;
  readOnly?: boolean;
  parentElement: MockElement | null;
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
  matches: (selector: string) => boolean;
  closest: (selector: string) => MockElement | null;
}

function createMockElement(
  tagName: string,
  opts: {
    attrs?: Record<string, string>;
    disabled?: boolean;
    readOnly?: boolean;
    parent?: MockElement | null;
  } = {}
): MockElement {
  const attrs = opts.attrs ?? {};
  const el: MockElement = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    attributes: attrs,
    disabled: opts.disabled,
    readOnly: opts.readOnly,
    parentElement: opts.parent ?? null,
    getAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    hasAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
    matches(selectorList: string) {
      const selectors = selectorList.split(',').map((s) => s.trim());
      return selectors.some((sel) => {
        if (sel === 'textarea') return el.tagName === 'TEXTAREA';
        if (sel === 'input') return el.tagName === 'INPUT';
        if (sel === 'button') return el.tagName === 'BUTTON';
        if (sel === 'select') return el.tagName === 'SELECT';
        if (sel === 'summary') return el.tagName === 'SUMMARY';
        if (sel === 'a[href]') return el.tagName === 'A' && el.hasAttribute('href');
        if (sel === 'label[for]') return el.tagName === 'LABEL' && el.hasAttribute('for');
        if (sel === '[contenteditable="true"]') return attrs.contenteditable === 'true';
        if (sel === '[contenteditable=""]') return attrs.contenteditable === '';
        if (sel === '[contenteditable="plaintext-only"]') return attrs.contenteditable === 'plaintext-only';
        if (sel === '[role="button"]') return attrs.role === 'button';
        if (sel === '[role="link"]') return attrs.role === 'link';
        if (sel === '[data-cursor="interactive"]') return attrs['data-cursor'] === 'interactive';
        if (sel === '[class*="cursor-pointer"]') return (attrs.class || '').includes('cursor-pointer');
        if (sel === '[aria-disabled="true"]') return attrs['aria-disabled'] === 'true';
        if (sel === '[tabindex]') return el.hasAttribute('tabindex');
        return false;
      });
    },
    closest(selectorList: string) {
      let cur: MockElement | null = el;
      while (cur) {
        if (cur.matches(selectorList)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
  };
  return el;
}

test('computeFrameIndependentLerp interpolates smoothly and snaps cleanly within threshold', () => {
  const step = computeFrameIndependentLerp(0, 100, ORBITAL_CURSOR_LERP_RATE, 16.6667);
  assert.equal(Math.round(step), 20);

  const snapped = computeFrameIndependentLerp(99.97, 100, ORBITAL_CURSOR_LERP_RATE, 16.6667);
  assert.equal(snapped, 100);
});

test('classifyCursorTarget detects text fields, clickable elements, disabled elements, and nested icons', () => {
  const emailInput = createMockElement('input', { attrs: { type: 'email' } });
  const textArea = createMockElement('textarea');
  const checkbox = createMockElement('input', { attrs: { type: 'checkbox' } });

  assert.equal(classifyCursorTarget(emailInput as unknown as EventTarget), 'text');
  assert.equal(classifyCursorTarget(textArea as unknown as EventTarget), 'text');
  assert.equal(classifyCursorTarget(checkbox as unknown as EventTarget), 'interactive');

  const btn = createMockElement('button');
  const iconInsideBtn = createMockElement('svg', { parent: btn });
  assert.equal(classifyCursorTarget(iconInsideBtn as unknown as EventTarget), 'interactive');

  const disabledBtn = createMockElement('button', { disabled: true });
  assert.equal(classifyCursorTarget(disabledBtn as unknown as EventTarget), 'default');

  const plainParagraph = createMockElement('p');
  assert.equal(classifyCursorTarget(plainParagraph as unknown as EventTarget), 'default');
});
