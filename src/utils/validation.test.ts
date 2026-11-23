import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBRL, validateContactForm, validateEmail } from './validation';

test('validateEmail rejects empty and malformed inputs and accepts valid emails', () => {
  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('invalido@').valid, false);
  assert.equal(validateEmail('contato@limiar.art').valid, true);
});

test('validateContactForm enforces all required fields', () => {
  const invalid = validateContactForm({
    name: 'A',
    email: 'errado',
    subject: 'Oi',
    message: 'curta',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.subject);
  assert.ok(invalid.errors.message);

  const valid = validateContactForm({
    name: 'Marina Silva',
    email: 'marina@exemplo.com',
    subject: 'Dúvida sobre numeração',
    message: 'Gostaria de confirmar as medidas da modelagem oversized.',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('formatBRL formats currency in Brazilian Portuguese', () => {
  const formatted = formatBRL(129.9);
  assert.ok(formatted.includes('129,90'));
});
