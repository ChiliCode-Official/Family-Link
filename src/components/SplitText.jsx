import React, { useState, useEffect, useRef } from 'react';

/**
 * SplitText component
 * Splits text into animated characters/words with customizable delays, easing, and directions.
 * Free, zero-dependency pure CSS/JS solution (Alternative to paid GSAP SplitText plugin).
 */
function SplitText({
  text = '',
  className = '',
  style = {},
  delay = 100, // delay between characters in ms or start delay
  duration = 0.6, // duration in seconds
  ease = 'power3.out', // power3.out, power2.out, ease-out, etc.
  splitType = 'chars', // 'chars' | 'words'
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'left',
  onLetterAnimationComplete,
  onAnimationComplete,
  tag: Tag = 'span'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  // Parse easing to CSS cubic-bezier
  const getEasing = (easeStr) => {
    switch (easeStr) {
      case 'power3.out':
        return 'cubic-bezier(0.215, 0.61, 0.355, 1)';
      case 'power2.out':
        return 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      case 'power4.out':
        return 'cubic-bezier(0.165, 0.84, 0.44, 1)';
      case 'back.out':
        return 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      default:
        return 'cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold, rootMargin: rootMargin || '0px' }
      );

      observer.observe(el);
      return () => observer.disconnect();
    } else {
      setIsVisible(true);
    }
  }, [threshold, rootMargin]);

  // Split into units
  const items = splitType === 'words' ? text.split(' ') : text.split('');

  const fromY = from.y !== undefined ? `${from.y}px` : (from.transform ? from.transform : '0px');
  const toY = to.y !== undefined ? `${to.y}px` : '0px';
  const fromOpacity = from.opacity !== undefined ? from.opacity : 0;
  const toOpacity = to.opacity !== undefined ? to.opacity : 1;

  const totalDurationMs = (items.length * (delay > 20 ? delay * 0.3 : delay) + duration * 1000);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        if (onAnimationComplete) onAnimationComplete();
        if (onLetterAnimationComplete) onLetterAnimationComplete();
      }, totalDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isVisible, totalDurationMs, onAnimationComplete, onLetterAnimationComplete]);

  return (
    <Tag
      ref={containerRef}
      className={className}
      style={{
        display: 'inline-block',
        textAlign,
        overflow: 'hidden',
        verticalAlign: 'bottom',
        ...style
      }}
    >
      {items.map((item, index) => {
        // Calculate stagger delay
        const itemDelayMs = index * (delay > 20 ? delay * 0.35 : delay);

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              whiteSpace: item === ' ' ? 'pre' : 'normal',
              opacity: isVisible ? toOpacity : fromOpacity,
              transform: isVisible ? `translate3d(0, ${toY}, 0)` : `translate3d(0, ${fromY}, 0)`,
              transition: `opacity ${duration}s ${getEasing(ease)} ${itemDelayMs}ms, transform ${duration}s ${getEasing(ease)} ${itemDelayMs}ms`,
              willChange: 'transform, opacity'
            }}
          >
            {item === ' ' ? '\u00A0' : item}
          </span>
        );
      })}
    </Tag>
  );
}

export default SplitText;
