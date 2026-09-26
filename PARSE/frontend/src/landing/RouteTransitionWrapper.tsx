import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const getVariants = (isReducedMotion: boolean) => ({
  initial: { opacity: 0 },
  enter: { 
    opacity: 1, 
    transition: { duration: isReducedMotion ? 0.15 : 0.35, ease: 'easeOut' as any }
  },
  exit: { 
    opacity: 0, 
    transition: { duration: isReducedMotion ? 0.15 : 0.35, ease: 'easeIn' as any }
  }
});

export default function RouteTransitionWrapper({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={getVariants(isReducedMotion)}
        style={{ width: '100%', height: '100%', position: 'relative', zIndex: 10 }}
        onAnimationComplete={() => {
          window.scrollTo(0, 0);
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
