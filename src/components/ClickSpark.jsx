import React, { useRef, useEffect, useCallback } from 'react';

/**
 * ClickSpark component
 * Generates dynamic, smooth, hardware-accelerated spark particle explosions on click/touch.
 * Free & pure Canvas/JS implementation with zero external paywalled libraries.
 */
function ClickSpark({
  sparkColor = '#fff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  children
}) {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const drawSparks = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = performance.now();

    // Filter active sparks
    sparksRef.current = sparksRef.current.filter(spark => {
      const elapsed = now - spark.startTime;
      if (elapsed >= duration) return false;

      const progress = elapsed / duration;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const currentRadius = spark.maxRadius * easeProgress;
      const opacity = 1 - progress;
      const currentSize = spark.size * (1 - progress * 0.5);

      const x = spark.x + Math.cos(spark.angle) * currentRadius;
      const y = spark.y + Math.sin(spark.angle) * currentRadius;

      // Draw spark beam / dot
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = spark.color;
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = Math.max(1.2, currentSize * 0.4);
      ctx.lineCap = 'round';

      // Line streak towards center
      const tailX = spark.x + Math.cos(spark.angle) * Math.max(0, currentRadius - currentSize);
      const tailY = spark.y + Math.sin(spark.angle) * Math.max(0, currentRadius - currentSize);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Tiny spark head dot
      ctx.beginPath();
      ctx.arc(x, y, currentSize * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return true;
    });

    if (sparksRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(drawSparks);
    } else {
      animationFrameRef.current = null;
    }
  }, [duration]);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    if (clientX === undefined || clientY === undefined) return;

    const originX = clientX;
    const originY = clientY;

    const now = performance.now();
    const newSparks = [];

    // Create sparks in radial pattern
    for (let i = 0; i < sparkCount; i++) {
      const baseAngle = (i / sparkCount) * (Math.PI * 2);
      const jitterAngle = (Math.random() - 0.5) * 0.4;
      const angle = baseAngle + jitterAngle;
      const distanceJitter = sparkRadius * (0.75 + Math.random() * 0.6);

      newSparks.push({
        x: originX,
        y: originY,
        angle,
        maxRadius: distanceJitter,
        size: sparkSize * (0.8 + Math.random() * 0.4),
        color: sparkColor === '#fff' || !sparkColor ? '#ffffff' : sparkColor,
        startTime: now
      });
    }

    sparksRef.current.push(...newSparks);

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(drawSparks);
    }
  }, [sparkColor, sparkCount, sparkRadius, sparkSize, drawSparks]);

  return (
    <div 
      onClick={handleClick}
      style={{ 
        position: 'relative', 
        width: '100%', 
        minHeight: '100%', 
        display: 'contents' 
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 99999,
        }}
      />
      {children}
    </div>
  );
}

export default ClickSpark;
