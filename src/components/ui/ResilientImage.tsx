import React, { useState } from 'react';
import { EclipseSigil } from '../ornaments/CybersigilismOrnaments';

interface ResilientImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  ...rest
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackTitle || 'Imagem Limiar'}
        className={`flex flex-col items-center justify-center gap-3 bg-[var(--bg-card-media)] text-[var(--text-muted)] p-6 text-center ${className}`}
      >
        <EclipseSigil className="w-10 h-10 opacity-45" />
        <span className="text-xs tracking-[0.12em] uppercase">
          {fallbackTitle || alt || 'Limiar'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
}
