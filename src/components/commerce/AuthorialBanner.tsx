import React from 'react';
import { useRouter } from '../../context/RouterContext';
import type { AuthorialBannerConfig } from '../../data/authorialBanners';

interface AuthorialBannerProps {
  banner: AuthorialBannerConfig;
}

/**
 * Container reutilizável e responsivo para banners autorais prontos.
 * Regra estrita: zero textos, preços ou botões HTML sobrepostos à arte do banner.
 */
export function AuthorialBanner({ banner }: AuthorialBannerProps) {
  const { navigate } = useRouter();

  if (!banner.desktopImage) return null;

  const media = (
    <picture className="block w-full h-full">
      {banner.mobileImage && (
        <source media="(max-width: 767px)" srcSet={banner.mobileImage} />
      )}
      <img
        src={banner.desktopImage}
        alt={banner.alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    </picture>
  );

  return (
    <section
      aria-label={banner.alt}
      className="relative mx-auto max-w-[1440px] px-4 sm:px-8 py-4 sm:py-6"
    >
      {banner.href ? (
        <a
          href={banner.href}
          onClick={(e) => {
            if (!banner.href) return;
            if (banner.href.startsWith('/')) {
              e.preventDefault();
              navigate(banner.href);
            }
          }}
          className={`block overflow-hidden rounded-[22px] sm:rounded-[26px] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors ${
            banner.aspectClassName || 'aspect-[16/9] md:aspect-[21/7]'
          }`}
        >
          {media}
        </a>
      ) : (
        <div
          className={`overflow-hidden rounded-[22px] sm:rounded-[26px] border border-[var(--border-hairline)] ${
            banner.aspectClassName || 'aspect-[16/9] md:aspect-[21/7]'
          }`}
        >
          {media}
        </div>
      )}
    </section>
  );
}
