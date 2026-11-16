import React, { useState, useEffect } from 'react';

/**
 * Transición circular de apertura sólida al entrar a la página.
 * Abre una ventana circular desde el centro hacia afuera de forma sutil y sólida.
 */
export const CircularTransition = () => {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    // Al finalizar la animación (1.25s), desmontar del DOM
    const timer = setTimeout(() => {
      setMounted(false);
    }, 1300);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[99999] pointer-events-none select-none overflow-hidden flex items-center justify-center"
    >
      {/* 
        Círculo expansivo con box-shadow sólido (#1E1B18 color tinta de TRICO'S).
        Abre suavemente la página de forma circular desde el centro.
      */}
      <div
        className="w-[280vmax] h-[280vmax] rounded-full animate-iris-expand flex-shrink-0"
        style={{
          boxShadow: '0 0 0 160vmax #1E1B18',
        }}
      />
    </div>
  );
};
