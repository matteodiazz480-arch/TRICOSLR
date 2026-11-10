import React from 'react';

/**
 * Componente oficial para Google Material Symbols Rounded
 */
export const Icon = ({ name, className = '', size = 22, filled = false }) => {
  return (
    <span
      className={`material-symbols-rounded select-none inline-flex items-center justify-center leading-none ${className}`}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};
