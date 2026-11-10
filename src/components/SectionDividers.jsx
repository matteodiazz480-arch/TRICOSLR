import React from 'react';

/**
 * Separador SVG estilo ondas / montañas con puntas redondeadas (Scalloped Border).
 * - Usa colores hexadecimales sólidos exactos para evitar cortes de color.
 * - Usa vectorEffect="non-scaling-stroke" para que el trazo negro mantenga un grosor
 *   uniforme y limpio en cualquier resolución sin deformarse ni cortarse en las crestas.
 */
export const ScallopedMountainDivider = ({
  topColor = '#FFC93C',
  bottomColor = '#FFFDF6',
  strokeColor = '#1E1B18',
  className = '',
  height = 'h-12 sm:h-16 md:h-20',
}) => {
  const wavePath =
    'M 0,60 C 120,16 240,16 360,60 C 480,104 600,104 720,60 C 840,16 960,16 1080,60 C 1200,104 1320,104 1440,60';

  return (
    <div
      className={`w-full overflow-hidden leading-[0] select-none relative pointer-events-none ${height} ${className}`}
      style={{
        backgroundColor: topColor,
        marginTop: '-1px',
        marginBottom: '-1px',
      }}
    >
      <svg
        className="block w-full h-full"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Relleno superior explícito para garantizar continuidad absoluta */}
        <rect x="0" y="0" width="1440" height="120" fill={topColor} />

        {/* Relleno inferior con cumbres y valles redondeados */}
        <path
          d={`${wavePath} L 1440,122 L 0,122 Z`}
          fill={bottomColor}
        />

        {/* Contorno cómic uniforme sin deformación por escala */}
        <path
          d={wavePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
