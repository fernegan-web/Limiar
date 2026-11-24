import React, { useState } from 'react';
import { useRouter } from '../../context/RouterContext';
import { LimiarLogo } from '../ui/LimiarLogo';
import {
  CybersigilismDivider,
  CybersigilismWeb,
  MoonPhases,
} from '../ornaments/CybersigilismOrnaments';

export function Footer() {
  const { navigate } = useRouter();
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    navigate(href);
  };

  const handleSocialPlaceholder = (network: string) => {
    setSocialNotice(`Canal oficial ${network} será vinculado antes da publicação final.`);
  };

  return (
    <footer className="relative overflow-hidden mt-24 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)]/45">
      <CybersigilismWeb
        tone="neutral"
        className="absolute -bottom-24 -left-20 w-[340px] h-[340px] opacity-35"
      />
      <CybersigilismWeb
        tone="uv"
        className="absolute -bottom-28 -right-24 w-[360px] h-[360px] rotate-180 opacity-30"
      />
      <div className="relative z-10 mx-auto max-w-[1360px] px-4 sm:px-8 pt-14 pb-10">
        <CybersigilismDivider className="w-full max-w-md mx-auto mb-12 opacity-65" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <a
              href="/"
              onClick={(e) => handleLink(e, '/')}
              aria-label="Limiar — Voltar ao início"
              className="inline-block"
            >
              <LimiarLogo className="h-12 w-auto" alt="Limiar" />
            </a>
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
              Moda, arte e cultura underground. Entre o que você acredita ser e aquilo que ainda não descobriu sobre si mesmo.
            </p>
          </div>

          {/* Loja */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--text-primary)]">
              Loja
            </h2>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <a href="/loja" onClick={(e) => handleLink(e, '/loja')} className="hover:text-[var(--text-primary)] transition-colors">
                  Todas as peças
                </a>
              </li>
              <li>
                <a href="/colecoes" onClick={(e) => handleLink(e, '/colecoes')} className="hover:text-[var(--text-primary)] transition-colors">
                  Coleções
                </a>
              </li>
              <li>
                <a href="/loja?sort=featured" onClick={(e) => handleLink(e, '/loja?sort=featured')} className="hover:text-[var(--text-primary)] transition-colors">
                  Destaques
                </a>
              </li>
            </ul>
          </div>

          {/* Institucional */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--text-primary)]">
              Institucional
            </h2>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <a href="/sobre" onClick={(e) => handleLink(e, '/sobre')} className="hover:text-[var(--text-primary)] transition-colors">
                  Sobre a Limiar
                </a>
              </li>
              <li>
                <a href="/contato" onClick={(e) => handleLink(e, '/contato')} className="hover:text-[var(--text-primary)] transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Ajuda & Informações */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--text-primary)]">
              Informações
            </h2>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <a href="/sobre#arquitetura" onClick={(e) => handleLink(e, '/sobre')} className="hover:text-[var(--text-primary)] transition-colors">
                  Envios e prazos
                </a>
              </li>
              <li>
                <a href="/contato" onClick={(e) => handleLink(e, '/contato')} className="hover:text-[var(--text-primary)] transition-colors">
                  Trocas e suporte
                </a>
              </li>
            </ul>
          </div>

          {/* Redes & Moon Phases */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--text-primary)]">
                Redes
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {['Instagram', 'SoundCloud', 'YouTube'].map((network) => (
                  <button
                    key={network}
                    type="button"
                    onClick={() => handleSocialPlaceholder(network)}
                    className="hover:text-[var(--text-primary)] transition-colors underline decoration-[var(--border-hairline)] underline-offset-4"
                  >
                    {network}
                  </button>
                ))}
              </div>
              {socialNotice && (
                <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                  {socialNotice}
                </p>
              )}
            </div>
            <MoonPhases className="w-28 h-auto text-[var(--text-secondary)] opacity-75" />
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>© 2026 Limiar. Todos os direitos reservados.</p>
          <p>Moda, arte e cultura underground.</p>
        </div>
      </div>
    </footer>
  );
}
