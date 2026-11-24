import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBRL,
  validateContactForm,
  validateEmail,
  validateLoginForm,
  validateRecoveryForm,
  validateSignupForm,
} from './validation';

test('validateEmail rejects empty and malformed inputs and accepts valid emails', () => {
  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('invalido@').valid, false);
  assert.equal(validateEmail('contato@limiarritual.com').valid, true);
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

test('validateLoginForm, validateSignupForm, and validateRecoveryForm enforce rules', () => {
  const badLogin = validateLoginForm({ email: 'bad', password: '123' });
  assert.equal(badLogin.valid, false);
  assert.ok(badLogin.errors.email);
  assert.ok(badLogin.errors.password);

  const okLogin = validateLoginForm({ email: 'pessoa@limiar.com', password: 'segredo123' });
  assert.equal(okLogin.valid, true);

  const mismatchSignup = validateSignupForm({
    fullName: 'Lu',
    email: 'pessoa@limiar.com',
    password: 'short',
    confirmPassword: 'other',
  });
  assert.equal(mismatchSignup.valid, false);
  assert.ok(mismatchSignup.errors.fullName);
  assert.ok(mismatchSignup.errors.password);
  assert.ok(mismatchSignup.errors.confirmPassword);

  const okSignup = validateSignupForm({
    fullName: 'Lucas Andrade',
    email: 'lucas@exemplo.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert.equal(okSignup.valid, true);

  assert.equal(validateRecoveryForm('').valid, false);
  assert.equal(validateRecoveryForm('lucas@exemplo.com').valid, true);
});

test('formatBRL formats currency in Brazilian Portuguese', () => {
  const formatted = formatBRL(129.9);
  assert.ok(formatted.includes('129,90'));
});
