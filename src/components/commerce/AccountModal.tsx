import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Eye, EyeOff, MessageCircle, X } from 'lucide-react';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';
import {
  isMemberAuthConnected,
  loginWixMember,
  registerWixMember,
  requestWixPasswordReset,
} from '../../services/wix/wixMembersService';
import {
  validateLoginForm,
  validateRecoveryForm,
  validateSignupForm,
} from '../../utils/validation';
import { buildContactWhatsAppUrl } from '../../utils/whatsapp';
import { LimiarLogo } from '../ui/LimiarLogo';
import { ThresholdMagnetic } from '../../motion/ThresholdPrimitives';
import { UltravioletButton } from '../ui/UltravioletButton';
import {
  CybersigilismCorner,
  EclipseSigil,
} from '../ornaments/CybersigilismOrnaments';

type AuthMode = 'login' | 'signup' | 'recovery';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  // Login fields (kept strictly in transient component state; never persisted)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [legalSlotNotice, setLegalSlotNotice] = useState<string | null>(null);

  // Recovery fields
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // Validation & feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const authConnected = isMemberAuthConnected();

  // Limpa credenciais sensíveis ao fechar ou alternar de modo
  const clearSensitiveFields = () => {
    setLoginPassword('');
    setSignupPassword('');
    setSignupConfirm('');
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowSignupConfirm(false);
    setErrors({});
    setStatusNotice(null);
    setLegalSlotNotice(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    clearSensitiveFields();
    setMode(nextMode);
  };

  useEffect(() => {
    if (!open) {
      clearSensitiveFields();
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNotice(null);

    const check = validateLoginForm({ email: loginEmail, password: loginPassword });
    if (!check.valid) {
      setErrors(check.errors as Record<string, string>);
      return;
    }

    setErrors({});
    if (!authConnected) {
      setStatusNotice(
        'O acesso à conta está temporariamente indisponível enquanto preparamos esta área. Se precisar acompanhar um pedido ou falar conosco, utilize o WhatsApp.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginWixMember({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (!result.connected) {
        setStatusNotice(
          'O acesso à conta está temporariamente indisponível enquanto preparamos esta área. Se precisar acompanhar um pedido ou falar conosco, utilize o WhatsApp.'
        );
      } else if (!result.ok) {
        setStatusNotice(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNotice(null);

    const check = validateSignupForm({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirm,
    });
    if (!check.valid) {
      setErrors(check.errors as Record<string, string>);
      return;
    }

    setErrors({});
    if (!authConnected) {
      setStatusNotice(
        'A criação de contas online está sendo finalizada para a próxima etapa da loja. Enquanto isso, você pode tirar dúvidas ou fazer seu pedido diretamente pelo WhatsApp.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerWixMember({
        fullName: signupName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
      });
      if (!result.connected) {
        setStatusNotice(
          'A criação de contas online está sendo finalizada para a próxima etapa da loja. Enquanto isso, você pode tirar dúvidas ou fazer seu pedido diretamente pelo WhatsApp.'
        );
      } else if (!result.ok) {
        setStatusNotice(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNotice(null);

    const check = validateRecoveryForm(recoveryEmail);
    if (!check.valid) {
      setErrors({ email: check.error ?? 'Informe um endereço de e-mail válido.' });
      return;
    }

    setErrors({});
    if (!authConnected) {
      setStatusNotice(
        'A redefinição automática de acesso ainda não foi ativada para contas públicas. Caso precise de suporte com algum pedido, fale diretamente pelo WhatsApp.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestWixPasswordReset(recoveryEmail.trim());
      if (!result.connected) {
        setStatusNotice(
          'A redefinição automática de acesso ainda não foi ativada para contas públicas. Caso precise de suporte com algum pedido, fale diretamente pelo WhatsApp.'
        );
      } else if (!result.ok) {
        setStatusNotice(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputBaseClass =
    'w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/65 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:ring-1 focus:ring-[var(--accent-uv-glow)] focus:outline-none transition-all duration-200';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center px-4 py-6 overflow-y-auto">
          <motion.button
            type="button"
            aria-label="Fechar painel de conta"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: THRESHOLD_EASE }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={
              mode === 'login'
                ? 'Entrar na sua conta Limiar'
                : mode === 'signup'
                  ? 'Criar conta Limiar'
                  : 'Recuperar acesso Limiar'
            }
            initial={{ opacity: 0, y: 14, scale: 0.965, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, scale: 0.975, filter: 'blur(6px)' }}
            transition={{ duration: 0.28, ease: THRESHOLD_EASE }}
            className="relative z-10 w-full max-w-[460px] glass-surface-strong rounded-[28px] p-6 sm:p-8 overflow-hidden border border-[var(--border-strong)] shadow-[0_28px_80px_-20px_rgba(0,0,0,0.65)]"
          >
            {/* Ornaments & Ambient Accents */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-[radial-gradient(circle,rgba(161,138,200,0.18)_0%,rgba(164,199,90,0.08)_48%,transparent_72%)]"
            />
            <CybersigilismCorner className="pointer-events-none absolute bottom-3 left-3 w-10 h-10 rotate-180 opacity-35" />

            {/* Top Row: Logo + Close */}
            <div className="relative z-10 flex items-center justify-between pb-5 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-3">
                <LimiarLogo className="h-9 w-auto" alt="Limiar" />
                <EclipseSigil className="w-4 h-4 text-[var(--accent-uv)] opacity-75" />
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar modal de conta"
                className="w-9 h-9 rounded-full border border-[var(--border-hairline)] inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Animated Auth Views */}
            <div className="relative z-10 pt-6">
              <AnimatePresence mode="wait">
                {mode === 'login' && (
                  <motion.form
                    key="auth-login"
                    onSubmit={handleLoginSubmit}
                    noValidate
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    transition={{ duration: 0.24, ease: THRESHOLD_EASE }}
                    className="space-y-5"
                  >
                    <div className="space-y-1.5">
                      <h2 className="font-display font-light text-2xl sm:text-[28px] tracking-[0.02em] text-[var(--text-primary)]">
                        Bem-vindo de volta.
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        Toda travessia deixa marcas. Continue de onde parou.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="auth-login-email"
                          className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                        >
                          E-mail
                        </label>
                        <input
                          id="auth-login-email"
                          type="email"
                          autoComplete="email"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                            if (statusNotice) setStatusNotice(null);
                          }}
                          placeholder="seu@email.com"
                          aria-invalid={Boolean(errors.email)}
                          className={inputBaseClass}
                        />
                        {errors.email && (
                          <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="auth-login-password"
                            className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                          >
                            Senha
                          </label>
                          <button
                            type="button"
                            onClick={() => switchMode('recovery')}
                            className="text-xs text-[var(--accent-uv)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-4 decoration-[var(--border-hairline)]"
                          >
                            Esqueceu sua senha?
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            id="auth-login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                              if (statusNotice) setStatusNotice(null);
                            }}
                            placeholder="••••••••"
                            aria-invalid={Boolean(errors.password)}
                            className={`${inputBaseClass} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((prev) => !prev)}
                            aria-label={showLoginPassword ? 'Ocultar senha' : 'Visualizar senha'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            {showLoginPassword ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                            {errors.password}
                          </p>
                        )}
                      </div>
                    </div>

                    {statusNotice && (
                      <div
                        role="status"
                        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs text-[var(--text-secondary)] space-y-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-[var(--accent-uv)] shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="leading-relaxed">{statusNotice}</span>
                        </div>
                        <a
                          href={buildContactWhatsAppUrl('Olá, Limiar! Preciso de ajuda com minha conta.')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-acid)] hover:underline underline-offset-4"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Falar pelo WhatsApp</span>
                        </a>
                      </div>
                    )}

                    <div className="pt-1">
                      <ThresholdMagnetic maxPull={3} className="w-full">
                        <UltravioletButton
                          type="submit"
                          variant="primary"
                          size="lg"
                          disabled={submitting}
                          className="w-full"
                        >
                          {submitting ? 'Verificando...' : 'Entrar'}
                        </UltravioletButton>
                      </ThresholdMagnetic>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-hairline)] text-center text-xs text-[var(--text-secondary)]">
                      <span>Ainda não atravessou o Limiar? </span>
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="text-[var(--text-primary)] font-medium hover:text-[var(--accent-acid)] underline underline-offset-4 transition-colors"
                      >
                        Crie sua conta.
                      </button>
                    </div>
                  </motion.form>
                )}

                {mode === 'signup' && (
                  <motion.form
                    key="auth-signup"
                    onSubmit={handleSignupSubmit}
                    noValidate
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    transition={{ duration: 0.24, ease: THRESHOLD_EASE }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <h2 className="font-display font-light text-2xl sm:text-[28px] tracking-[0.02em] text-[var(--text-primary)]">
                        Atravesse o Limiar.
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        Existe mais em você do que aquilo que já conhece. Sua travessia começa aqui.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="auth-signup-name"
                          className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                        >
                          Nome completo
                        </label>
                        <input
                          id="auth-signup-name"
                          type="text"
                          autoComplete="name"
                          value={signupName}
                          onChange={(e) => {
                            setSignupName(e.target.value);
                            if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                            if (statusNotice) setStatusNotice(null);
                          }}
                          placeholder="Seu nome completo"
                          aria-invalid={Boolean(errors.fullName)}
                          className={inputBaseClass}
                        />
                        {errors.fullName && (
                          <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                            {errors.fullName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="auth-signup-email"
                          className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                        >
                          E-mail
                        </label>
                        <input
                          id="auth-signup-email"
                          type="email"
                          autoComplete="email"
                          value={signupEmail}
                          onChange={(e) => {
                            setSignupEmail(e.target.value);
                            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                            if (statusNotice) setStatusNotice(null);
                          }}
                          placeholder="seu@email.com"
                          aria-invalid={Boolean(errors.email)}
                          className={inputBaseClass}
                        />
                        {errors.email && (
                          <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="auth-signup-password"
                            className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                          >
                            Senha
                          </label>
                          <div className="relative">
                            <input
                              id="auth-signup-password"
                              type={showSignupPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={signupPassword}
                              onChange={(e) => {
                                setSignupPassword(e.target.value);
                                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                                if (statusNotice) setStatusNotice(null);
                              }}
                              placeholder="Mínimo 8 caracteres"
                              aria-invalid={Boolean(errors.password)}
                              className={`${inputBaseClass} pr-10`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupPassword((prev) => !prev)}
                              aria-label={showSignupPassword ? 'Ocultar senha' : 'Visualizar senha'}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              {showSignupPassword ? (
                                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          {errors.password && (
                            <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                              {errors.password}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="auth-signup-confirm"
                            className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                          >
                            Confirmar senha
                          </label>
                          <div className="relative">
                            <input
                              id="auth-signup-confirm"
                              type={showSignupConfirm ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={signupConfirm}
                              onChange={(e) => {
                                setSignupConfirm(e.target.value);
                                if (errors.confirmPassword) {
                                  setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                                }
                                if (statusNotice) setStatusNotice(null);
                              }}
                              placeholder="Repita sua senha"
                              aria-invalid={Boolean(errors.confirmPassword)}
                              className={`${inputBaseClass} pr-10`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupConfirm((prev) => !prev)}
                              aria-label={
                                showSignupConfirm
                                  ? 'Ocultar confirmação de senha'
                                  : 'Visualizar confirmação de senha'
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              {showSignupConfirm ? (
                                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                              {errors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Espaço reservado para Termos de Uso e Política de Privacidade */}
                    <div className="text-[11px] text-[var(--text-muted)] leading-relaxed space-y-1.5">
                      <p>
                        Ao criar sua conta, você concorda com os{' '}
                        <button
                          type="button"
                          onClick={() =>
                            setLegalSlotNotice(
                              'Os Termos de Uso oficiais serão disponibilizados neste espaço.'
                            )
                          }
                          className="text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
                        >
                          Termos de Uso
                        </button>{' '}
                        e a{' '}
                        <button
                          type="button"
                          onClick={() =>
                            setLegalSlotNotice(
                              'A Política de Privacidade oficial será disponibilizada neste espaço.'
                            )
                          }
                          className="text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
                        >
                          Política de Privacidade
                        </button>
                        .
                      </p>
                      {legalSlotNotice && (
                        <p className="text-[11px] text-[var(--accent-uv)]">{legalSlotNotice}</p>
                      )}
                    </div>

                    {statusNotice && (
                      <div
                        role="status"
                        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs text-[var(--text-secondary)] space-y-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-[var(--accent-uv)] shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="leading-relaxed">{statusNotice}</span>
                        </div>
                        <a
                          href={buildContactWhatsAppUrl('Olá, Limiar! Gostaria de realizar um atendimento.')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-acid)] hover:underline underline-offset-4"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Falar pelo WhatsApp</span>
                        </a>
                      </div>
                    )}

                    <div className="pt-1">
                      <ThresholdMagnetic maxPull={3} className="w-full">
                        <UltravioletButton
                          type="submit"
                          variant="primary"
                          size="lg"
                          disabled={submitting}
                          className="w-full"
                        >
                          {submitting ? 'Processando...' : 'Criar minha conta'}
                        </UltravioletButton>
                      </ThresholdMagnetic>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-hairline)] text-center text-xs text-[var(--text-secondary)]">
                      <span>Já faz parte? </span>
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-[var(--text-primary)] font-medium hover:text-[var(--accent-acid)] underline underline-offset-4 transition-colors"
                      >
                        Entre na sua conta.
                      </button>
                    </div>
                  </motion.form>
                )}

                {mode === 'recovery' && (
                  <motion.form
                    key="auth-recovery"
                    onSubmit={handleRecoverySubmit}
                    noValidate
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    transition={{ duration: 0.24, ease: THRESHOLD_EASE }}
                    className="space-y-5"
                  >
                    <div className="space-y-1.5">
                      <h2 className="font-display font-light text-2xl sm:text-[28px] tracking-[0.02em] text-[var(--text-primary)]">
                        Recupere seu acesso.
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        Informe o e-mail associado à sua conta para redefinir sua senha.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="auth-recovery-email"
                        className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                      >
                        E-mail
                      </label>
                      <input
                        id="auth-recovery-email"
                        type="email"
                        autoComplete="email"
                        value={recoveryEmail}
                        onChange={(e) => {
                          setRecoveryEmail(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                          if (statusNotice) setStatusNotice(null);
                        }}
                        placeholder="seu@email.com"
                        aria-invalid={Boolean(errors.email)}
                        className={inputBaseClass}
                      />
                      {errors.email && (
                        <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {statusNotice && (
                      <div
                        role="status"
                        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs text-[var(--text-secondary)] space-y-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-[var(--accent-uv)] shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="leading-relaxed">{statusNotice}</span>
                        </div>
                        <a
                          href={buildContactWhatsAppUrl('Olá, Limiar! Preciso de ajuda para recuperar meu acesso.')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-acid)] hover:underline underline-offset-4"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Falar pelo WhatsApp</span>
                        </a>
                      </div>
                    )}

                    <div className="pt-1">
                      <ThresholdMagnetic maxPull={3} className="w-full">
                        <UltravioletButton
                          type="submit"
                          variant="secondary"
                          size="lg"
                          disabled={submitting}
                          className="w-full"
                        >
                          {submitting ? 'Processando...' : 'Redefinir senha'}
                        </UltravioletButton>
                      </ThresholdMagnetic>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-hairline)] text-center text-xs text-[var(--text-secondary)]">
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-[var(--text-primary)] font-medium hover:text-[var(--accent-uv)] underline underline-offset-4 transition-colors"
                      >
                        Voltar para o login.
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
