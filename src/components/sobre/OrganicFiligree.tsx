import React from 'react';

interface OrganicFiligreeProps {
  src: string;
  className?: string;
  opacityClass?: string;
}

/**
 * Renderiza um grafismo orgânico transparente da pasta 10-grafismos sempre ao fundo,
 * preservando integralmente suas cores RGBA originais em ambos os temas:
 * sem invert(), sem brightness(), sem contrast(), sem filtros SVG e com
 * filter: none e mix-blend-mode: normal.
 */
export const OrganicFiligree = React.forwardRef<HTMLDivElement, OrganicFiligreeProps>(
  function OrganicFiligree(
    { src, className = '', opacityClass = 'opacity-[0.58]' },
    ref
  ) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={`pointer-events-none select-none will-change-transform ${className}`}
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          style={{ filter: 'none', mixBlendMode: 'normal' }}
          className={`w-full h-full object-contain filter-none mix-blend-normal ${opacityClass}`}
        />
      </div>
    );
  }
);
