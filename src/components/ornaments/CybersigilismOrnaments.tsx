import React from 'react';

interface StarProps {
  className?: string;
}

export function LimiarStar({ className = 'w-5 h-5' }: StarProps) {
  return (
    <svg viewBox="0 0 36 36" fill="none" aria-hidden="true" className={className}>
      <path
        d="M18 1.5C18.6 12.6 23.4 17.4 34.5 18C23.4 18.6 18.6 23.4 18 34.5C17.4 23.4 12.6 18.6 1.5 18C12.6 17.4 17.4 12.6 18 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        fill="currentColor"
        fillOpacity="0.14"
      />
    </svg>
  );
}

export function EclipseSigil({ className = 'w-8 h-8' }: StarProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.6" />
      <path
        d="M24 3V13M24 35V45M3 24H13M35 24H45"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.48"
      />
      <path
        d="M24 16C24.5 21.5 26.5 23.5 32 24C26.5 24.5 24.5 26.5 24 32C23.5 26.5 21.5 24.5 16 24C21.5 23.5 23.5 21.5 24 16Z"
        fill="currentColor"
        fillOpacity="0.58"
      />
    </svg>
  );
}

interface WebProps {
  className?: string;
  tone?: 'neutral' | 'uv' | 'acid' | 'mineral';
}

export function CybersigilismWeb({ className = '', tone = 'neutral' }: WebProps) {
  const colorVar =
    tone === 'uv'
      ? 'var(--ornament-accent-uv)'
      : tone === 'acid'
        ? 'var(--ornament-accent-acid)'
        : tone === 'mineral'
          ? 'var(--accent-mineral)'
          : 'var(--ornament-stroke)';

  return (
    <svg
      viewBox="0 0 460 460"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ color: colorVar }}
    >
      <path
        d="M14 52C102 98 158 154 212 242C148 190 92 166 20 178C106 144 168 88 232 10C206 102 234 170 320 222C248 212 202 246 184 340C166 270 122 242 40 264C128 224 156 164 14 52Z"
        fill="currentColor"
        fillOpacity="0.46"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M438 38C362 122 322 194 302 292C278 216 230 182 146 202C236 162 284 100 304 14C324 108 368 160 450 170C372 194 340 256 362 362C312 282 256 260 164 300C260 242 332 166 438 38Z"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeOpacity="0.72"
      />
      <path
        d="M72 426C150 364 218 342 312 356C236 310 206 250 236 158C258 254 306 302 414 314C326 342 288 388 302 450C258 400 190 392 72 426Z"
        fill="currentColor"
        fillOpacity="0.28"
        stroke="currentColor"
        strokeWidth="0.95"
      />
      {/* Delicate thorny offshoots */}
      <path
        d="M212 242C244 268 278 264 308 236M146 202C116 218 82 246 58 296M232 10C248 48 258 76 286 98"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeOpacity="0.55"
      />
    </svg>
  );
}

export function CybersigilismDivider({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 48"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ color: 'var(--ornament-strong)' }}
    >
      <path
        d="M0 24H272C306 24 328 15 360 4C392 15 414 24 448 24H720"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M210 24C276 24 316 32 360 44C404 32 444 24 510 24"
        stroke="currentColor"
        strokeWidth="0.85"
        strokeOpacity="0.65"
      />
      <path
        d="M360 9C362.8 18.5 366 21.8 375.5 24C366 26.2 362.8 29.5 360 39C357.2 29.5 354 26.2 344.5 24C354 21.8 357.2 18.5 360 9Z"
        fill="currentColor"
        fillOpacity="0.72"
      />
      <circle cx="272" cy="24" r="2" fill="currentColor" fillOpacity="0.5" />
      <circle cx="448" cy="24" r="2" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

export function CybersigilismSpine({
  className = 'w-12 h-28',
  tone = 'neutral',
}: WebProps) {
  const colorVar =
    tone === 'uv' ? 'var(--ornament-accent-uv)' : 'var(--ornament-strong)';

  return (
    <svg
      viewBox="0 0 80 180"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ color: colorVar }}
    >
      <path
        d="M40 4V176M40 24C52 38 64 40 72 34C60 48 54 56 40 62C26 56 20 48 8 34C16 40 28 38 40 24ZM40 74C56 88 68 90 76 84C62 98 54 106 40 114C26 106 18 98 4 84C12 90 24 88 40 74ZM40 124C50 136 60 138 66 134C56 144 50 150 40 158C30 150 24 144 14 134C20 138 30 136 40 124Z"
        stroke="currentColor"
        strokeWidth="1.05"
      />
      <circle cx="40" cy="68" r="2.2" fill="currentColor" />
      <circle cx="40" cy="119" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function CybersigilismCorner({ className = 'w-14 h-14' }: StarProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ color: 'var(--ornament-strong)' }}
    >
      <path
        d="M6 2C24 8 34 18 42 36C30 22 20 16 2 14C18 12 28 16 58 6C38 20 34 32 42 58C28 38 18 30 2 28"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.72"
      />
    </svg>
  );
}

export function PortalSingularity({ className = 'w-[440px] h-[440px]' }: StarProps) {
  return (
    <svg
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      <circle
        cx="210"
        cy="210"
        r="176"
        stroke="var(--ornament-stroke)"
        strokeWidth="1"
        strokeDasharray="3 7"
      />
      <circle
        cx="210"
        cy="210"
        r="148"
        stroke="var(--ornament-accent-uv)"
        strokeWidth="1.2"
      />
      <circle
        cx="210"
        cy="210"
        r="116"
        stroke="var(--ornament-stroke)"
        strokeWidth="0.85"
      />
      {/* Orbiting sigil barbs */}
      <path
        d="M210 18C214 54 224 68 242 74C224 80 214 94 210 124C206 94 196 80 178 74C196 68 206 54 210 18Z"
        stroke="var(--ornament-strong)"
        strokeWidth="0.9"
        fill="var(--ornament-accent-uv)"
        fillOpacity="0.35"
      />
      <path
        d="M210 296C213 324 221 336 236 342C221 348 213 360 210 398C207 360 199 348 184 342C199 336 207 324 210 296Z"
        stroke="var(--ornament-strong)"
        strokeWidth="0.9"
        fill="var(--ornament-stroke)"
        fillOpacity="0.28"
      />
      <path
        d="M24 210H72M348 210H396"
        stroke="var(--ornament-stroke)"
        strokeWidth="0.9"
      />
    </svg>
  );
}

export function MoonPhases({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 44" fill="none" aria-hidden="true" className={className}>
      <path
        d="M28 8C20.5 10.2 15.5 16.5 15.5 22C15.5 27.5 20.5 33.8 28 36C22.8 32.5 20.2 27.6 20.2 22C20.2 16.4 22.8 11.5 28 8Z"
        fill="currentColor"
        fillOpacity="0.68"
      />
      <circle cx="70" cy="22" r="15" stroke="currentColor" strokeOpacity="0.38" strokeWidth="1" />
      <circle cx="70" cy="22" r="12" fill="currentColor" fillOpacity="0.16" />
      <circle cx="67" cy="19" r="3" fill="currentColor" fillOpacity="0.24" />
      <circle cx="74" cy="25" r="4.5" fill="currentColor" fillOpacity="0.16" />
      <path
        d="M112 8C119.5 10.2 124.5 16.5 124.5 22C124.5 27.5 119.5 33.8 112 36C117.2 32.5 119.8 27.6 119.8 22C119.8 16.4 117.2 11.5 112 8Z"
        fill="currentColor"
        fillOpacity="0.68"
      />
    </svg>
  );
}
