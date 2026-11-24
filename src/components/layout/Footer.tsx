import React from 'react';
import { useRouter } from '../../context/RouterContext';
import { LIMIAR_CHANNELS } from '../../utils/whatsapp';
import { LimiarLogo } from '../ui/LimiarLogo';
import {
  CybersigilismDivider,
  MoonPhases,
} from '../ornaments/CybersigilismOrnaments';

export function Footer() {
  const { navigate } = useRouter();

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    navigate(href);
  };

  return (
    <footer className="relative z-10 overflow-hidden mt-24 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)]/45">
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
                  Sobre Limiar
                </a>
              </li>
              <li>
                <a href="/contato" onClick={(e) => handleLink(e, '/contato')} className="hover:text-[var(--text-primary)] transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Informações */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--text-primary)]">
              Informações
            </h2>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <a href="/sobre" onClick={(e) => handleLink(e, '/sobre')} className="hover:text-[var(--text-primary)] transition-colors">
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

          {/* CONECTE-SE & Moon Phases */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--text-primary)]">
                CONECTE-SE
              </h2>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>
                  <a
                    href={LIMIAR_CHANNELS.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--text-primary)] transition-colors underline decoration-[var(--border-hairline)] underline-offset-4"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href={LIMIAR_CHANNELS.whatsappBaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--text-primary)] transition-colors underline decoration-[var(--border-hairline)] underline-offset-4"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${LIMIAR_CHANNELS.email}`}
                    className="hover:text-[var(--text-primary)] transition-colors underline decoration-[var(--border-hairline)] underline-offset-4"
                  >
                    E-mail
                  </a>
                </li>
              </ul>
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
