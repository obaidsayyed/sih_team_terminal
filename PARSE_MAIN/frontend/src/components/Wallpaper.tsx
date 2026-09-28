import { useEffect, useRef } from 'react';
import './Wallpaper.css';

interface WallpaperProps {
  riskState?: 'safe' | 'warn' | 'danger' | 'idle';
  solidBackground?: boolean;
  children: React.ReactNode;
}

export default function Wallpaper({ riskState = 'idle', solidBackground = false, children }: WallpaperProps) {
  const isVisible = useRef(true);

  // Global mouse tracking for CSS vars
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--my', `${e.clientY}px`);
    };

    const handleVisibilityChange = () => {
      isVisible.current = document.visibilityState === 'visible';
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className={`wallpaper-root risk-${riskState} ${solidBackground ? 'solid-bg' : ''}`}>
      <div className="light-field light-1" />
      <div className="light-field light-2" />
      <div className="film-grain" />
      <div className="risk-vignette" />
      <div className="content-layer">
        {children}
      </div>
    </div>
  );
}
