import React, { useEffect, useRef, useState } from 'react';

/**
 * Componente de animación de entrada al hacer scroll (Fade-in + Slide-up)
 * siguiendo las curvas de Emil Kowalski (--ease-out) y LottieFiles Motion Design.
 */
export const Reveal = ({
  children,
  className = '',
  delay = 0,
  yOffset = 24,
}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -30px 0px',
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
        transform: isVisible ? 'translate3d(0, 0, 0)' : `translate3d(0, ${yOffset}px, 0)`,
        transition: `opacity 480ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms, transform 480ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
