import React from 'react';

interface LimiarLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Renderiza exclusivamente o arquivo original oficial da logo Limiar.
 * No modo escuro utiliza mix-blend-screen para tornar o fundo preto transparente.
 * No modo claro utiliza invert + mix-blend-multiply para manter contraste nítido.
 */
export function LimiarLogo({
  className = 'h-12 w-auto',
  alt = 'Limiar',
}: LimiarLogoProps) {
  return (
    <picture className="inline-flex items-center shrink-0">
      <source
        srcSet="/assets/limiar-logo-256.webp 256w, /assets/limiar-logo-512.webp 512w"
        sizes="(max-width: 640px) 120px, 160px"
        type="image/webp"
      />
      <img
        src="/assets/aistudio/LIMIAR_LOGO_d4da5a59.png"
        alt={alt}
        width={512}
        height={512}
        decoding="async"
        referrerPolicy="no-referrer"
        className={`object-contain select-none transition-[filter] duration-300 dark:mix-blend-screen invert mix-blend-multiply dark:invert-0 scale-110 ${className}`}
      />
    </picture>
  );
}
