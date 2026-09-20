import { useRef, useEffect } from 'react';

export default function InteractiveBackground() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;
    let targetX = currentX;
    let targetY = currentY;
    let rafId: number;

    // Linear interpolation for smooth trailing spotlight
    const lerp = (start: number, end: number, amt: number) => {
      return (1 - amt) * start + amt * end;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      currentX = lerp(currentX, targetX, 0.15);
      currentY = lerp(currentY, targetY, 0.15);
      
      if (bgRef.current) {
        bgRef.current.style.setProperty('--mouse-x', `${currentX}px`);
        bgRef.current.style.setProperty('--mouse-y', `${currentY}px`);
      }
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="auth-interactive-bg" ref={bgRef} aria-hidden="true">
      {/* The base grid that is illuminated by the spotlight mask */}
      <div className="auth-grid-pattern"></div>
      
      {/* A dynamic soft glow that tracks the cursor */}
      <div className="auth-spotlight-glow"></div>
      
      <div className="auth-grain"></div>
    </div>
  );
}
