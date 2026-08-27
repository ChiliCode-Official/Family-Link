import React, { useId } from 'react';

/**
 * StrokeText Component
 * Renders an animated SVG stroke drawing + wipe fill effect on text.
 */
export default function StrokeText({
  text = 'FAMILY',
  strokeColor = '#A78BFA',
  fillColor = '#F8FAFC',
  strokeWidth = 0,
  drawDuration = 1.6,
  fillDelay = 0.2,
  fontSize = 36,
  fontWeight = 800,
  letterSpacing = 0,
  className = '',
  style = {}
}) {
  const maskId = useId().replace(/:/g, '-');
  const animKey = `stroke-anim-${maskId}`;

  // Approximate SVG bounding box dimensions based on font size & character count
  const estimatedWidth = Math.max(120, text.length * (fontSize * 0.64) + Math.abs(letterSpacing) * text.length + 20);
  const estimatedHeight = fontSize * 1.35;

  return (
    <div 
      className={`stroke-text-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        maxWidth: '100%',
        overflow: 'visible',
        ...style
      }}
    >
      <style>{`
        @keyframes drawStroke-${maskId} {
          0% {
            stroke-dashoffset: 600;
            opacity: 0.2;
          }
          10% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes wipeFill-${maskId} {
          0% {
            opacity: 0;
            clip-path: inset(0 100% 0 0);
          }
          40% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
            clip-path: inset(0 0% 0 0);
          }
        }

        .${animKey}-stroke {
          stroke: ${strokeWidth > 0 ? strokeColor : 'transparent'};
          stroke-width: ${strokeWidth}px;
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: transparent;
          ${strokeWidth > 0 ? `animation: drawStroke-${maskId} ${drawDuration}s cubic-bezier(0.16, 1, 0.3, 1) forwards;` : ''}
        }

        .${animKey}-fill {
          fill: ${fillColor};
          animation: wipeFill-${maskId} ${drawDuration * 0.75}s cubic-bezier(0.16, 1, 0.3, 1) ${fillDelay}s forwards;
          opacity: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .${animKey}-stroke {
            animation: none;
            stroke-dashoffset: 0;
          }
          .${animKey}-fill {
            animation: none;
            opacity: 1;
            clip-path: none;
          }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${estimatedWidth} ${estimatedHeight}`}
        width={estimatedWidth}
        height={estimatedHeight}
        style={{
          display: 'block',
          overflow: 'visible',
          maxWidth: '100%',
          height: 'auto'
        }}
        aria-label={text}
        role="img"
      >
        {/* Layer 1: Filled text with wipe animation */}
        <text
          x="4"
          y={fontSize * 1.02}
          fontSize={fontSize}
          fontWeight={fontWeight}
          letterSpacing={letterSpacing}
          fontFamily="var(--heading)"
          className={`${animKey}-fill`}
        >
          {text}
        </text>

        {/* Layer 2: Stroke path outline with animated draw effect */}
        <text
          x="4"
          y={fontSize * 1.02}
          fontSize={fontSize}
          fontWeight={fontWeight}
          letterSpacing={letterSpacing}
          fontFamily="var(--heading)"
          className={`${animKey}-stroke`}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}
