import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ShieldCheck, Trash2, X } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext';
import { usePersonalization } from '../../context/PersonalizationContext';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';

export function PrivacyPreferencesModal() {
  const {
    consentState,
    preferencesModalOpen,
    closePreferencesModal,
    savePreferences,
    acceptAll,
    rejectNonEssential,
  } = useConsent();
  const { clearHistory } = usePersonalization();

  const [personalization, setPersonalization] = useState(
    consentState.preferences.personalization
  );
  const [analytics, setAnalytics] = useState(consentState.preferences.analytics);
  const [marketing, setMarketing] = useState(consentState.preferences.marketing);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [historyClearedNotice, setHistoryClearedNotice] = useState(false);

  useEffect(() => {
    if (!preferencesModalOpen) return;
    setPersonalization(consentState.preferences.personalization);
    setAnalytics(consentState.preferences.analytics);
    setMarketing(consentState.preferences.marketing);
    setHistoryClearedNotice(false);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreferencesModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [preferencesModalOpen, consentState.preferences, closePreferencesModal]);

  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      await clearHistory();
      setHistoryClearedNotice(true);
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <AnimatePresence>
      {preferencesModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 overflow-y-auto">
          <motion.button
            type="button"
            aria-label="Fechar preferências de privacidade"
            onClick={closePreferencesModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: THRESHOLD_EASE }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Gerenciar preferências de privacidade e cookies"
            data-testid="privacy-preferences-modal"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: THRESHOLD_EASE }}
            className="relative z-10 w-full max-w-lg glass-surface-strong rounded-[26px] border border-[var(--border-strong)] p-6 sm:p-7 space-y-5 shadow-[0_28px_80px_-20px_rgba(0,0,0,0.65)]"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="w-5 h-5 text-[var(--accent-uv)] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <h2 className="font-display text-lg uppercase tracking-[0.06em] font-medium text-[var(--text-primary)]">
                    Preferências de Privacidade
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Controle suas permissões de cookies, recomendações e publicidade conforme a LGPD.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePreferencesModal}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full border border-[var(--border-hairline)] inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Essenciais */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.14em] font-medium text-[var(--text-primary)]">
                    Essenciais
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Necessários para funcionamento do carrinho, tema, autenticação Wix e checkout seguro.
                  </p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--accent-acid)] font-medium pt-0.5">
                  Sempre ativo
                </span>
              </div>

              {/* Personalização */}
              <label className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex items-start justify-between gap-4 cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-1">
                  <span className="block text-xs uppercase tracking-[0.14em] font-medium text-[var(--text-primary)]">
                    Personalização
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] leading-relaxed">
                    Lembra peças visualizadas e categorias de interesse para ajustar recomendações na loja.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={personalization}
                  onChange={(e) => setPersonalization(e.target.checked)}
                  data-testid="consent-toggle-personalization"
                  className="mt-1 h-4 w-4 accent-[var(--accent-uv)]"
                />
              </label>

              {/* Analytics */}
              <label className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex items-start justify-between gap-4 cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-1">
                  <span className="block text-xs uppercase tracking-[0.14em] font-medium text-[var(--text-primary)]">
                    Analytics
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] leading-relaxed">
                    Permite mensurar desempenho de navegação e buscas para aprimorar a experiência da loja.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  data-testid="consent-toggle-analytics"
                  className="mt-1 h-4 w-4 accent-[var(--accent-uv)]"
                />
              </label>

              {/* Marketing */}
              <label className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex items-start justify-between gap-4 cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-1">
                  <span className="block text-xs uppercase tracking-[0.14em] font-medium text-[var(--text-primary)]">
                    Marketing e Publicidade
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] leading-relaxed">
                    Habilita Pixels e eventos de conversão (Meta Ads e TikTok Ads) quando configurados.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  data-testid="consent-toggle-marketing"
                  className="mt-1 h-4 w-4 accent-[var(--accent-uv)]"
                />
              </label>
            </div>

            {/* Controle explícito de limpeza do histórico comportamental */}
            <div className="pt-2 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={clearingHistory}
                data-testid="clear-behavior-history-btn"
                className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-terracotta)] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {clearingHistory ? 'Limpando histórico...' : 'Limpar histórico de navegação'}
                </span>
              </button>

              {historyClearedNotice && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-acid)]">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Histórico removido.</span>
                </span>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={rejectNonEssential}
                  className="px-3.5 py-2 rounded-full border border-[var(--border-hairline)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Recusar opcionais
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="px-3.5 py-2 rounded-full border border-[var(--border-strong)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                >
                  Aceitar tudo
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  savePreferences({
                    personalization,
                    analytics,
                    marketing,
                  })
                }
                data-testid="consent-save-preferences"
                className="px-5 py-2 rounded-full bg-[var(--text-primary)] text-[var(--text-inverse)] text-[11px] uppercase tracking-[0.14em] font-medium hover:opacity-90 transition-opacity"
              >
                Salvar escolhas
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
