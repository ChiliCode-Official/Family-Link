import React, { useState, useEffect, useRef } from 'react';

/**
 * BlurText component
 * Animates text with sequential motion blur, opacity, and directional translate.
 * Free, zero-dependency lightweight CSS/JS implementation (ReactBits / UIverse style).
 */
function BlurText({
  text = '',
  delay = 150,
  animateBy = 'words', // 'words' | 'letters'
  direction = 'top', // 'top' | 'bottom'
  onAnimationComplete,
  className = '',
  style = {},
  threshold = 0.1,
  rootMargin = '-50px',
  tag: Tag = 'p'
}) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        },
        { threshold, rootMargin: rootMargin || '0px' }
      );

      observer.observe(el);
      return () => observer.disconnect();
    } else {
      setInView(true);
    }
  }, [threshold, rootMargin]);

  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const initialY = direction === 'top' ? -18 : 18;

  const totalTimeMs = elements.length * (delay > 20 ? delay * 0.35 : delay) + 600;

  useEffect(() => {
    if (inView && onAnimationComplete) {
      const timeout = setTimeout(onAnimationComplete, totalTimeMs);
      return () => clearTimeout(timeout);
    }
  }, [inView, totalTimeMs, onAnimationComplete]);

  return (
    <Tag
      ref={containerRef}
      className={className}
      style={{
        display: 'inline-block',
        margin: 0,
        ...style
      }}
    >
      {elements.map((segment, index) => {
        const segmentDelayMs = index * (delay > 20 ? delay * 0.35 : delay);

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              whiteSpace: segment === ' ' ? 'pre' : 'normal',
              opacity: inView ? 1 : 0,
              filter: inView ? 'blur(0px)' : 'blur(10px)',
              transform: inView ? 'translate3d(0, 0, 0)' : `translate3d(0, ${initialY}px, 0)`,
              transition: `opacity 0.6s cubic-bezier(0.2, 0.65, 0.3, 0.9) ${segmentDelayMs}ms, filter 0.6s cubic-bezier(0.2, 0.65, 0.3, 0.9) ${segmentDelayMs}ms, transform 0.6s cubic-bezier(0.2, 0.65, 0.3, 0.9) ${segmentDelayMs}ms`,
              marginRight: animateBy === 'words' && index < elements.length - 1 ? '0.3em' : '0',
              willChange: 'transform, filter, opacity'
            }}
          >
            {segment === ' ' ? '\u00A0' : segment}
          </span>
        );
      })}
    </Tag>
  );
}

export default BlurText;
