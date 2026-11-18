import React, { useEffect, useRef, useState } from 'react';

/**
 * Componente de animación de entrada suave y bidireccional inspirado en Motion.
 * Se re-ejecuta de forma fluida tanto al bajar como al subir con scroll,
 * detectando la visibilidad del elemento continuamente mediante IntersectionObserver.
 * 
 * Cumple con la regla de animaciones reutilizables: no se desconecta al activarse,
 * permitiendo que los elementos vuelvan a animarse suavemente cada vez que entran en pantalla.
 */
export const Reveal = ({
  children,
  className = '',
  delay = 0,
  yOffset = 20,
  duration = 440,
  scale = 0.98,
}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Observer bidireccional continuo
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -35px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translate3d(0, 0, 0) scale(1)'
          : `translate3d(0, ${yOffset}px, 0) scale(${scale})`,
        transition: `opacity ${duration}ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
