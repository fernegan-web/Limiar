import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { StateMachine } from '@wix/sdk';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConsent } from '../../context/ConsentContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useRouter } from '../../context/RouterContext';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';
import {
  getWixMemberOrdersUrl,
  isMemberAuthConnected,
  loginWixMember,
  registerWixMember,
  requestWixPasswordReset,
  startWixHostedAuth,
  verifyWixMemberCode,
  type WixAuthActionResult,
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

type AuthMode = 'login' | 'signup' | 'recovery' | 'verify';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  const { pathname, search } = useRouter();
  const { member, isAuthenticated, setAuthenticatedMember, refreshMember, logout } = useAuth();
  const { openPreferencesModal } = useConsent();
  const { favoriteIds } = useFavorites();
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

  // Recovery & Verification fields
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingState, setPendingState] = useState<StateMachine | null>(null);

  // Validation & feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'captcha'>('info');
  const [submitting, setSubmitting] = useState(false);
  const [openingOrders, setOpeningOrders] = useState(false);

  const authConnected = isMemberAuthConnected();

  // Limpa credenciais sensíveis ao fechar ou alternar de modo
  const clearSensitiveFields = () => {
    setLoginPassword('');
    setSignupPassword('');
    setSignupConfirm('');
    setVerificationCode('');
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowSignupConfirm(false);
    setErrors({});
    setStatusNotice(null);
    setStatusKind('info');
    setLegalSlotNotice(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    clearSensitiveFields();
    if (nextMode !== 'verify') {
      setPendingState(null);
    }
    setMode(nextMode);
  };

  useEffect(() => {
    if (!open) {
      clearSensitiveFields();
      setPendingState(null);
      setMode('login');
      return;
    }
    if (isAuthenticated && !member) {
      refreshMember().catch(() => {});
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, isAuthenticated, member, refreshMember]);

  const handleAuthActionResult = async (result: WixAuthActionResult) => {
    if (result.ok) {
      const resolvedMember = result.member ?? (await refreshMember());
      setAuthenticatedMember(resolvedMember);
      clearSensitiveFields();
      setPendingState(null);
      setStatusKind('success');
      setStatusNotice('Sessão iniciada com sucesso.');
      return;
    }

    if (result.status === 'email_verification_required') {
      setPendingState(result.pendingState);
      setStatusKind('info');
      setStatusNotice(result.message);
      setMode('verify');
      return;
    }

    if (result.status === 'captcha_required') {
      setStatusKind('captcha');
      setStatusNotice(result.message);
      return;
    }

    setStatusKind('info');
    setStatusNotice(result.message);
  };

  const handleHostedOAuth = async () => {
    setSubmitting(true);
    setStatusNotice(null);
    try {
      const returnPath = `${pathname || '/'}${search || ''}`;
      const { authUrl } = await startWixHostedAuth({ returnPath, prompt: 'login' });
      window.location.assign(authUrl);
    } catch {
      setStatusKind('info');
      setStatusNotice('Não foi possível abrir o login oficial neste momento. Tente novamente.');
      setSubmitting(false);
    }
  };

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
      setStatusKind('info');
      setStatusNotice(
        'O acesso à conta está temporariamente indisponível. Se precisar acompanhar um pedido ou falar conosco, utilize o WhatsApp.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginWixMember({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      await handleAuthActionResult(result);
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
      setStatusKind('info');
      setStatusNotice(
        'O cadastro está temporariamente indisponível. Enquanto isso, você pode falar diretamente pelo WhatsApp.'
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
      await handleAuthActionResult(result);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNotice(null);

    if (!verificationCode.trim() || !pendingState) {
      setErrors({ code: 'Informe o código de verificação enviado ao seu e-mail.' });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const result = await verifyWixMemberCode({
        verificationCode,
        pendingState,
      });
      await handleAuthActionResult(result);
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
      setStatusKind('info');
      setStatusNotice(
        'A redefinição de senha está temporariamente indisponível. Caso precise de suporte, fale diretamente pelo WhatsApp.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestWixPasswordReset(recoveryEmail.trim());
      setStatusKind(result.ok ? 'success' : 'info');
      setStatusNotice(result.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenOrders = async () => {
    setOpeningOrders(true);
    try {
      const ordersUrl = await getWixMemberOrdersUrl();
      window.location.assign(ordersUrl);
    } finally {
      setOpeningOrders(false);
    }
  };

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await logout();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const inputBaseClass =
    'w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/65 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv)] focus:ring-1 focus:ring-[var(--accent-uv-glow)] focus:outline-none transition-all duration-200';

  const renderStatusBanner = () => {
    if (!statusNotice) return null;
    const Icon = statusKind === 'success' ? CheckCircle2 : AlertCircle;
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs text-[var(--text-secondary)] space-y-2.5"
      >
        <div className="flex items-start gap-2.5">
          <Icon
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              statusKind === 'success'
                ? 'text-[var(--accent-acid)]'
                : 'text-[var(--accent-uv)]'
            }`}
            aria-hidden="true"
          />
          <span className="leading-relaxed">{statusNotice}</span>
        </div>

        {statusKind === 'captcha' && (
          <button
            type="button"
            onClick={handleHostedOAuth}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--accent-uv)]/50 bg-[var(--accent-uv-glow)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] hover:border-[var(--accent-uv)] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Continuar no login oficial Limiar</span>
          </button>
        )}

        {statusKind === 'info' && (
          <a
            href={buildContactWhatsAppUrl('Olá, Limiar! Preciso de ajuda com minha conta.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-acid)] hover:underline underline-offset-4"
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Falar pelo WhatsApp</span>
          </a>
        )}
      </div>
    );
  };

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
              isAuthenticated
                ? 'Minha conta Limiar'
                : mode === 'login'
                  ? 'Entrar na sua conta Limiar'
                  : mode === 'signup'
                    ? 'Criar conta Limiar'
                    : mode === 'verify'
                      ? 'Confirmar código de verificação'
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
              {isAuthenticated ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 text-[var(--accent-acid)]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent-uv)]">
                        Sessão ativa
                      </p>
                      <h2 className="font-display font-light text-2xl text-[var(--text-primary)] truncate">
                        {member?.name || 'Membro Limiar'}
                      </h2>
                      {member?.email && (
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {member?.addresses && member.addresses.length > 0 && (
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Endereço salvo</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {[
                          member.addresses[0].street,
                          member.addresses[0].city,
                          member.addresses[0].subdivision,
                          member.addresses[0].postalCode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    {favoriteIds.length > 0 && (
                      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 px-3.5 py-2.5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-[var(--accent-uv)]" aria-hidden="true" />
                          <span>Peças salvas nos favoritos</span>
                        </span>
                        <span className="tabular-nums font-medium text-[var(--text-primary)]">
                          {favoriteIds.length}
                        </span>
                      </div>
                    )}

                    <ThresholdMagnetic maxPull={3} className="w-full">
                      <UltravioletButton
                        type="button"
                        variant="primary"
                        size="lg"
                        disabled={openingOrders}
                        onClick={handleOpenOrders}
                        className="w-full"
                      >
                        <Package className="w-4 h-4 mr-2" aria-hidden="true" />
                        <span>{openingOrders ? 'Abrindo pedidos...' : 'Meus pedidos'}</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-75" aria-hidden="true" />
                      </UltravioletButton>
                    </ThresholdMagnetic>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openPreferencesModal();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-hairline)] px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Privacidade e Histórico</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleLogout}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-hairline)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{submitting ? 'Encerrando...' : 'Sair da conta'}</span>
                    </button>
                  </div>
                </div>
              ) : (
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

                      {renderStatusBanner()}

                      <div className="pt-1 space-y-2.5">
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

                        <button
                          type="button"
                          onClick={handleHostedOAuth}
                          disabled={submitting}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-hairline)] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Entrar via página oficial Wix</span>
                        </button>
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

                      {renderStatusBanner()}

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

                  {mode === 'verify' && (
                    <motion.form
                      key="auth-verify"
                      onSubmit={handleVerifySubmit}
                      noValidate
                      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                      transition={{ duration: 0.24, ease: THRESHOLD_EASE }}
                      className="space-y-5"
                    >
                      <div className="space-y-1.5">
                        <h2 className="font-display font-light text-2xl sm:text-[28px] tracking-[0.02em] text-[var(--text-primary)]">
                          Confirme seu e-mail.
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          Digite o código de verificação enviado para concluir sua entrada.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="auth-verify-code"
                          className="block text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                        >
                          Código de verificação
                        </label>
                        <input
                          id="auth-verify-code"
                          type="text"
                          inputMode="numeric"
                          value={verificationCode}
                          onChange={(e) => {
                            setVerificationCode(e.target.value);
                            if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
                            if (statusNotice) setStatusNotice(null);
                          }}
                          placeholder="000000"
                          className={inputBaseClass}
                        />
                        {errors.code && (
                          <p role="alert" className="text-xs text-[var(--accent-terracotta)]">
                            {errors.code}
                          </p>
                        )}
                      </div>

                      {renderStatusBanner()}

                      <div className="pt-1">
                        <ThresholdMagnetic maxPull={3} className="w-full">
                          <UltravioletButton
                            type="submit"
                            variant="primary"
                            size="lg"
                            disabled={submitting}
                            className="w-full"
                          >
                            {submitting ? 'Confirmando...' : 'Validar código'}
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

                      {renderStatusBanner()}

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
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
