import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from '../../context/RouterContext';

export type LimiarButtonVariant = 'primary' | 'secondary' | 'tertiary';

export interface UltravioletButtonProps {
  children: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  showArrow?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: LimiarButtonVariant;
  className?: string;
  ariaLabel?: string;
}

export function UltravioletButton({
  children,
  href,
  target,
  rel,
  onClick,
  type = 'button',
  disabled = false,
  showArrow = true,
  icon,
  size = 'md',
  variant = 'primary',
  className = '',
  ariaLabel,
}: UltravioletButtonProps) {
  const elRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const { navigate } = useRouter();

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const node = elRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    node.style.setProperty('--uv-x', `${x}px`);
    node.style.setProperty('--uv-y', `${y}px`);
  };

  const handlePointerLeave = () => {
    const node = elRef.current;
    if (!node) return;
    node.style.setProperty('--uv-x', '50%');
    node.style.setProperty('--uv-y', '50%');
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-4 py-2 text-[11px] tracking-[0.16em] gap-2.5'
      : size === 'lg'
        ? 'px-6 py-3 text-xs tracking-[0.18em] gap-4'
        : 'px-5 py-2.5 text-xs tracking-[0.16em] gap-3';

  const variantClass =
    variant === 'secondary'
      ? 'uv-glow-btn--secondary'
      : variant === 'tertiary'
        ? 'uv-glow-btn--tertiary'
        : 'uv-glow-btn--primary font-semibold';

  const arrowBorderClasses =
    variant === 'primary'
      ? 'border border-[rgba(8,9,9,0.22)] bg-[rgba(8,9,9,0.12)] text-[#0B0E07]'
      : variant === 'tertiary'
        ? 'border border-[var(--border-hairline)] bg-transparent text-current'
        : 'border border-[var(--border-strong)] bg-[var(--bg-glass)] text-[var(--text-primary)]';

  const baseClasses = `uv-glow-btn ${variantClass} group inline-flex items-center justify-between rounded-full uppercase font-medium whitespace-nowrap shrink-0 disabled:opacity-45 disabled:pointer-events-none ${sizeClasses} ${className}`;

  const arrowBadge = showArrow ? (
    <span
      className={`uv-glow-arrow inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${arrowBorderClasses}`}
    >
      {icon ?? <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
    </span>
  ) : null;

  if (href) {
    const isInternal = href.startsWith('/');
    return (
      <a
        ref={elRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        target={isInternal ? undefined : target}
        rel={isInternal ? undefined : rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={(e) => {
          if (isInternal) {
            e.preventDefault();
            navigate(href);
          }
          onClick?.(e);
        }}
        className={baseClasses}
      >
        <span className="inline-flex items-center gap-2">{children}</span>
        {arrowBadge}
      </a>
    );
  }

  return (
    <button
      ref={elRef as React.RefObject<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      className={baseClasses}
    >
      <span className="inline-flex items-center gap-2">{children}</span>
      {arrowBadge}
    </button>
  );
}

export const LimiarButton = UltravioletButton;
