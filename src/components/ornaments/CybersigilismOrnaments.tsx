import React from 'react';

interface StarProps {
  className?: string;
}

export function LimiarStar({ className = 'w-5 h-5' }: StarProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className={className}
    >
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
      <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.55" />
      <path d="M24 3V13M24 35V45M3 24H13M35 24H45" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
      <path
        d="M24 16C24.5 21.5 26.5 23.5 32 24C26.5 24.5 24.5 26.5 24 32C23.5 26.5 21.5 24.5 16 24C21.5 23.5 23.5 21.5 24 16Z"
        fill="currentColor"
        fillOpacity="0.55"
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
          ? 'rgba(140, 166, 180, 0.16)'
          : 'var(--ornament-stroke)';

  return (
    <svg
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ color: colorVar }}
    >
      <path
        d="M12 48C94 92 146 144 196 226C136 178 86 154 18 164C98 134 156 82 212 10C188 94 214 156 292 204C226 196 184 226 168 312C152 248 112 222 36 242C118 206 144 152 12 48Z"
        fill="currentColor"
        fillOpacity="0.48"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M398 34C328 112 292 178 274 268C252 198 208 166 132 184C214 148 258 92 276 12C294 98 334 146 410 156C338 178 308 234 328 332C282 258 232 238 148 274C236 220 302 152 398 34Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.65"
      />
      <path
        d="M64 388C136 332 198 312 284 324C214 282 186 228 214 144C234 232 278 276 376 286C296 312 262 354 274 410C234 364 172 356 64 388Z"
        fill="currentColor"
        fillOpacity="0.28"
        stroke="currentColor"
        strokeWidth="0.9"
      />
    </svg>
  );
}

export function CybersigilismDivider({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 44"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ color: 'var(--ornament-stroke)' }}
    >
      <path
        d="M0 22H256C282 22 298 14 320 4C342 14 358 22 384 22H640"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M210 22C264 22 292 29 320 40C348 29 376 22 430 22"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.7"
      />
      <path
        d="M320 9C322.5 17.5 325.5 20.5 334 22C325.5 23.5 322.5 26.5 320 35C317.5 26.5 314.5 23.5 306 22C314.5 20.5 317.5 17.5 320 9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MoonPhases({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Left waxing crescent */}
      <path
        d="M28 8C20.5 10.2 15.5 16.5 15.5 22C15.5 27.5 20.5 33.8 28 36C22.8 32.5 20.2 27.6 20.2 22C20.2 16.4 22.8 11.5 28 8Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
      {/* Center eclipse moon */}
      <circle cx="70" cy="22" r="15" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="70" cy="22" r="12" fill="currentColor" fillOpacity="0.16" />
      <circle cx="67" cy="19" r="3" fill="currentColor" fillOpacity="0.22" />
      <circle cx="74" cy="25" r="4.5" fill="currentColor" fillOpacity="0.14" />
      {/* Right waning crescent */}
      <path
        d="M112 8C119.5 10.2 124.5 16.5 124.5 22C124.5 27.5 119.5 33.8 112 36C117.2 32.5 119.8 27.6 119.8 22C119.8 16.4 117.2 11.5 112 8Z"
        fill="currentColor"
        fillOpacity="0.65"
      />
    </svg>
  );
}
