import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { completeWixOAuthCallback } from '../services/wix/wixMembersService';
import { UltravioletButton } from '../components/ui/UltravioletButton';

export function AuthCallbackPage() {
  const { navigate } = useRouter();
  const { refreshMember, setAuthenticatedMember } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Concluindo sua travessia e validando sua sessão...');

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await completeWixOAuthCallback();
      if (!active) return;

      if (!result.ok) {
        setStatus('error');
        setMessage(result.message || 'Não foi possível concluir o login.');
        return;
      }

      const member = await refreshMember();
      if (!active) return;
      setAuthenticatedMember(member);
      setStatus('success');
      setMessage('Acesso confirmado. Redirecionando...');

      window.setTimeout(() => {
        if (active) {
          navigate(result.returnPath || '/');
        }
      }, 650);
    })();

    return () => {
      active = false;
    };
  }, [navigate, refreshMember, setAuthenticatedMember]);

  return (
    <section className="mx-auto max-w-[540px] px-4 sm:px-8 py-24 sm:py-32">
      <div className="glass-surface-strong rounded-[28px] border border-[var(--border-strong)] p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          {status === 'processing' && (
            <Loader2 className="w-5 h-5 text-[var(--accent-uv)] animate-spin" aria-hidden="true" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-[var(--accent-acid)]" aria-hidden="true" />
          )}
          {status === 'error' && (
            <AlertCircle className="w-5 h-5 text-[var(--accent-terracotta)]" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-light text-2xl text-[var(--text-primary)]">
            {status === 'processing'
              ? 'Validando acesso'
              : status === 'success'
                ? 'Sessão autenticada'
                : 'Não foi possível entrar'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{message}</p>
        </div>

        {status === 'error' && (
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <UltravioletButton variant="primary" size="md" onClick={() => navigate('/')}>
              Voltar à loja
            </UltravioletButton>
          </div>
        )}
      </div>
    </section>
  );
}
