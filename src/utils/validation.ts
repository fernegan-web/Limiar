export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Informe um endereço de e-mail.' };
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(trimmed)) {
    return { valid: false, error: 'Formato de e-mail inválido.' };
  }
  return { valid: true };
}

export interface ContactFormInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ContactFormInput, string>>;
}

export function validateContactForm(input: ContactFormInput): ContactValidationResult {
  const errors: Partial<Record<keyof ContactFormInput, string>> = {};

  if (input.name.trim().length < 2) {
    errors.name = 'Informe seu nome (mínimo 2 caracteres).';
  }

  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) {
    errors.email = emailCheck.error;
  }

  if (input.subject.trim().length < 3) {
    errors.subject = 'Informe o assunto da mensagem.';
  }

  if (input.message.trim().length < 10) {
    errors.message = 'Escreva uma mensagem com pelo menos 10 caracteres.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
