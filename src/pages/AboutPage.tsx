import React from 'react';
import { SobreLimiarSection } from '../components/sobre/SobreLimiarSection';

/**
 * Página Sobre Limiar
 * Renderiza a experiência autoral completa do Universo Limiar com seus seis blocos
 * narrativos, colagens, filigranas e física de travessia.
 */
export function AboutPage() {
  return (
    <div className="relative overflow-x-clip min-h-screen">
      <SobreLimiarSection />
    </div>
  );
}
