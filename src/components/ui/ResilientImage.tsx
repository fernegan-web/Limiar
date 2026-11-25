import React, { useState } from 'react';
import { EclipseSigil } from '../ornaments/CybersigilismOrnaments';

interface ResilientImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

const CATALOG_WEBP_MAP: Record<string, { srcSet: string; defaultSizes: string }> = {
  '/src/assets/images/banner_singularity_eclipse_1795475559021.jpg': {
    srcSet:
      '/assets/catalog/banner_singularity_eclipse-680.webp 680w, /assets/catalog/banner_singularity_eclipse-1200.webp 1200w',
    defaultSizes: '(max-width: 768px) 94vw, 1200px',
  },
  '/src/assets/images/hero_model_limiar_1795475558113.jpg': {
    srcSet:
      '/assets/catalog/hero_model_limiar-480.webp 480w, /assets/catalog/hero_model_limiar-760.webp 760w',
    defaultSizes: '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px',
  },
  '/src/assets/images/product_frequency_tee_1795475558648.jpg': {
    srcSet:
      '/assets/catalog/product_frequency_tee-480.webp 480w, /assets/catalog/product_frequency_tee-760.webp 760w',
    defaultSizes: '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px',
  },
  '/src/assets/images/product_tribal_tee_1795475558848.jpg': {
    srcSet:
      '/assets/catalog/product_tribal_tee-480.webp 480w, /assets/catalog/product_tribal_tee-760.webp 760w',
    defaultSizes: '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px',
  },
  '/src/assets/images/product_void_hoodie_1795475558966.jpg': {
    srcSet:
      '/assets/catalog/product_void_hoodie-480.webp 480w, /assets/catalog/product_void_hoodie-760.webp 760w',
    defaultSizes: '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px',
  },
  '/src/assets/images/product_ritual_cargo_1795475559881.jpg': {
    srcSet:
      '/assets/catalog/product_ritual_cargo-480.webp 480w, /assets/catalog/product_ritual_cargo-760.webp 760w',
    defaultSizes: '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px',
  },
};

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  sizes,
  decoding = 'async',
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

  const webpEntry = CATALOG_WEBP_MAP[src];

  if (webpEntry) {
    return (
      <picture className="contents">
        <source
          srcSet={webpEntry.srcSet}
          sizes={sizes ?? webpEntry.defaultSizes}
          type="image/webp"
        />
        <img
          src={src}
          alt={alt}
          decoding={decoding}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={className}
          {...rest}
        />
      </picture>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      decoding={decoding}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
}
