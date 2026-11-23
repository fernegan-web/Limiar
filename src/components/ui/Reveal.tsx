import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

/**
 * Scroll-reveal performático com IntersectionObserver + verificação de viewport.
 * Garante conteúdo acessível mesmo sem JS, com prefers-reduced-motion ou rolagem rápida.
 */
export function Reveal({ children, delayMs = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) {
      setVisible(true);
      return;
    }

    const checkInView = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 160 && rect.bottom >= -120) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (checkInView()) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.01, rootMargin: '160px 0px 160px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible
          ? 'opacity-100 translate-y-0 blur-0'
          : 'opacity-0 translate-y-4 blur-[5px]'
      } ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
