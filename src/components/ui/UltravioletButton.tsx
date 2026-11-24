import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from '../../context/RouterContext';

interface UltravioletButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  showArrow?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
  ariaLabel?: string;
}

export function UltravioletButton({
  children,
  href,
  onClick,
  type = 'button',
  disabled = false,
  showArrow = true,
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

  const variantClasses =
    variant === 'secondary'
      ? 'border-[var(--border-hairline)] bg-[var(--bg-glass)]'
      : 'border-[var(--border-strong)]';

  const baseClasses = `uv-glow-btn group inline-flex items-center justify-between rounded-full uppercase font-medium whitespace-nowrap shrink-0 text-[var(--text-primary)] disabled:opacity-45 disabled:pointer-events-none ${sizeClasses} ${variantClasses} ${className}`;

  const arrowBadge = showArrow ? (
    <span className="uv-glow-arrow inline-flex items-center justify-center w-7 h-7 rounded-full border border-[var(--border-strong)] bg-[var(--bg-glass)] text-[var(--text-primary)] shrink-0">
      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  ) : null;

  if (href) {
    return (
      <a
        ref={elRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={(e) => {
          if (href.startsWith('/')) {
            e.preventDefault();
            navigate(href);
          }
          onClick?.(e);
        }}
        className={baseClasses}
      >
        <span>{children}</span>
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
      <span>{children}</span>
      {arrowBadge}
    </button>
  );
}
