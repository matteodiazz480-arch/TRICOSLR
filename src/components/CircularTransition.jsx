import React, { useState, useEffect, useRef } from 'react';

/**
 * Transición circular de apertura sólida al ingresar a la página.
 * Tapa toda la pantalla con una capa sólida (#1E1B18) por encima de todo el contenido
 * y se va abriendo en forma de círculo relleno desde el centro hacia afuera,
 * con ritmo pausado, fluido y 100% responsive.
 */
export const CircularTransition = () => {
  const [mounted, setMounted] = useState(true);
  const circleRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const initialHoldMs = 180;
    const durationMs = 1750;
    let rafId = null;
    const startTime = performance.now();

    const getMaxRadius = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth || 1000;
      const h = rect?.height || window.innerHeight || 1000;
      return Math.hypot(w / 2, h / 2) + 50;
    };

    // Curva suave (easeInOutCubic): arranca sutil, acelera con solidez y termina suave
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const tick = (now) => {
      const elapsed = now - startTime;

      if (elapsed < initialHoldMs) {
        if (circleRef.current) {
          circleRef.current.setAttribute('r', '0');
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      const rawProgress = Math.min((elapsed - initialHoldMs) / durationMs, 1);
      const eased = easeInOutCubic(rawProgress);
      const currentRadius = eased * getMaxRadius();

      if (circleRef.current) {
        circleRef.current.setAttribute('r', String(currentRadius));
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setMounted(false);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ zIndex: 2147483647 }}
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
    >
      <svg
        className="w-full h-full block"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask
            id="tricos-circular-reveal-mask"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            {/* Capa blanca: mantiene visible la cortina sólida sobre toda la página */}
            <rect x="0" y="0" width="100%" height="100%" fill="#FFFFFF" />
            {/* Círculo negro: recorta la apertura circular que se va expandiendo */}
            <circle
              ref={circleRef}
              cx="50%"
              cy="50%"
              r="0"
              fill="#000000"
            />
          </mask>
        </defs>

        {/* Capa sólida opaca (#1E1B18) por encima de absolutamente toda la página */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="#1E1B18"
          mask="url(#tricos-circular-reveal-mask)"
        />
      </svg>
    </div>
  );
};
