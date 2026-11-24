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

export interface LoginFormInput {
  email: string;
  password: string;
}

export function validateLoginForm(input: LoginFormInput): {
  valid: boolean;
  errors: Partial<Record<keyof LoginFormInput, string>>;
} {
  const errors: Partial<Record<keyof LoginFormInput, string>> = {};
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) {
    errors.email = emailCheck.error;
  }
  if (!input.password || input.password.length < 6) {
    errors.password = 'Informe sua senha (mínimo 6 caracteres).';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export interface SignupFormInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateSignupForm(input: SignupFormInput): {
  valid: boolean;
  errors: Partial<Record<keyof SignupFormInput, string>>;
} {
  const errors: Partial<Record<keyof SignupFormInput, string>> = {};

  if (input.fullName.trim().length < 3) {
    errors.fullName = 'Informe seu nome completo.';
  }

  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) {
    errors.email = emailCheck.error;
  }

  if (input.password.length < 8) {
    errors.password = 'A senha deve ter no mínimo 8 caracteres.';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Confirme sua senha.';
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'As senhas informadas não coincidem.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRecoveryForm(email: string): {
  valid: boolean;
  error?: string;
} {
  return validateEmail(email);
}
