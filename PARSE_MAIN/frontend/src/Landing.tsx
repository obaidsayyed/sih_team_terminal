import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent, useInView, useMotionValue } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './landing/landing-v8.css';
import NodeBackground from './components/NodeBackground';

import { bgStore } from './bgStore';

gsap.registerPlugin(ScrollTrigger);

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
function MagneticCard({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-200, 200], [5, -5]);
  const rotateY = useTransform(x, [-200, 200], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
function splitToChars(text: string, baseDelay = 0.4, accent = false) {
  return text.split('').map((char, i) => (
    <span
      key={i}
      className={`v8-char ${accent ? 'v8-char-accent' : ''}`}
      style={{ animationDelay: `${baseDelay + i * 0.035}s` }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));
}

function AnimatedCounter({
  target,
  duration = 2000,
  suffix = '%',
  inView,
}: {
  target: number;
  duration?: number;
  suffix?: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return (
    <>
      {count}
      {suffix}
    </>
  );
}

function ScrollRevealText({
  text,
  progress,
}: {
  text: string;
  progress: number;
}) {
  const words = useMemo(() => text.split(' '), [text]);
  return (
    <>
      {words.map((word, i) => {
        const wordProgress = i / words.length;
        const isLit = progress > wordProgress;
        return (
          <span key={i} className={`v8-word ${isLit ? 'v8-lit' : ''}`}>
            {word}{' '}
          </span>
        );
      })}
    </>
  );
}

function MetricsRing({
  value,
  inView,
}: {
  value: number;
  inView: boolean;
}) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const filled = inView ? (value / 100) * circumference : 0;

  return (
    <div className="v8-metrics-ring-container">
      <svg className="v8-metrics-ring" viewBox="0 0 280 280">
        <circle cx="140" cy="140" r={radius} className="v8-ring-bg" />
        <circle
          cx="140"
          cy="140"
          r={radius}
          className="v8-ring-fill"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="v8-ring-center-text">
        <div className="v8-ring-number">
          <AnimatedCounter target={value} inView={inView} />
        </div>
        <div className="v8-ring-label">Encrypted Threats</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------------
export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isDiving, setIsDiving] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const { scrollYProgress } = useScroll({ target: rootRef });
  const smoothProgress = useSpring(scrollYProgress, {
    damping: 20,
    stiffness: 100,
    mass: 0.5,
  });

  const threatRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLElement>(null);
  const threatInView = useInView(threatRef, { once: false, margin: '-30%' });
  const metricsInView = useInView(metricsRef, { once: true, margin: '-30%' });

  const [activeSection, setActiveSection] = useState(0);

  useGSAP(() => {
    // Pin Hero Section
    ScrollTrigger.create({
      trigger: ".v8-hero",
      start: "top top",
      end: "+=100%", 
      pin: true,
      pinSpacing: true,
      scrub: 1,
      animation: gsap.to(".v8-hero-inner", { opacity: 0, y: -100, scale: 0.9, ease: "none" })
    });

    // Velocity skew effect
    const proxy = { skew: 0 };
    const skewSetter = gsap.quickSetter(".v8-content-layer", "skewY", "deg");
    const clamp = gsap.utils.clamp(-3, 3);

    ScrollTrigger.create({
      onUpdate: (self) => {
        const skew = clamp(self.getVelocity() / -400);
        if (Math.abs(skew) > Math.abs(proxy.skew)) {
          proxy.skew = skew;
          gsap.to(proxy, {
            skew: 0,
            duration: 0.8,
            ease: "power3",
            overwrite: true,
            onUpdate: () => skewSetter(proxy.skew)
          });
        }
      }
    });

    // Section Dot Navigation
    gsap.utils.toArray(".v8-section").forEach((section: any, i) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onToggle: self => self.isActive && setActiveSection(i)
      });
    });

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, { scope: rootRef });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleDive = () => {
    setIsDiving(true);
    bgStore.setIsDiving(true);
    setTimeout(() => navigate('/app'), isReducedMotion ? 150 : 700);
  };

  useMotionValueEvent(smoothProgress, 'change', (v) => bgStore.setProgress(v));

  useEffect(() => {
    bgStore.setIsDiving(false);
    return () => {
      if (!bgStore.isDiving) {
        bgStore.setProgress(0);
      }
    };
  }, []);

  const threatWordProgress = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);
  const [threatWordPct, setThreatWordPct] = useState(0);
  useMotionValueEvent(threatWordProgress, 'change', (v) => setThreatWordPct(v));

  return (
    <div className="v8-root" ref={rootRef}>
      <div style={{ position: 'fixed', inset: 0, opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        <NodeBackground />
      </div>

      <motion.div
        className="v8-scroll-progress"
        style={{ scaleX: smoothProgress }}
      />

      <div className={`v8-dive-overlay ${isDiving ? 'v8-active' : ''}`} />

      <div className="v8-side-nav">
        {[0, 1, 2, 3, 4].map((i) => (
           <div key={i} className={`v8-dot ${activeSection === i ? 'v8-active' : ''}`} />
        ))}
      </div>

      <div className="v8-content-layer">
        <div className="v8-nav-wrapper">
          <nav className="v8-nav v8-interactive">
            <div className="v8-nav-brand">P.A.R.S.E</div>
            <div className="v8-nav-actions">
              <button className="v8-nav-launch" onClick={handleDive}>
                Launch App
              </button>
            </div>
          </nav>
        </div>

        {/* SECTION 1 — ORBITAL HERO */}
        <section className="v8-section v8-hero">
          <motion.div
            className="v8-hero-inner v8-interactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="v8-hero-title">
              {splitToChars('See Through')}
              <br />
              {splitToChars('Encryption.', 0.4 + 'See Through'.length * 0.035, true)}
            </h1>

            <div className="v8-hero-rule"></div>

            <p className="v8-hero-subtitle">
              The first network analysis engine that operates entirely on
              encrypted telemetry. No keys, no payloads — absolute privacy.
              <span className="v8-typewriter-cursor" />
            </p>

            <div className="v8-hero-ctas">
              <button className="v8-btn-engine" onClick={handleDive}>
                Enter the Engine
              </button>
              <button
                className="v8-btn-explore"
                onClick={() =>
                  threatRef.current?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Explore ↓
              </button>
            </div>
          </motion.div>

          <div className="v8-scroll-hint v8-interactive">
            <span className="v8-scroll-hint-text">Scroll</span>
            <span className="v8-scroll-hint-line" />
          </div>
        </section>

        {/* SECTION 2 — THREAT TUNNEL */}
        <section className="v8-section v8-threat" ref={threatRef}>
          <div className="v8-threat-editorial v8-interactive">
            <div className="v8-threat-stat-wrapper">
              <div className="v8-threat-stat tabular-nums">
                <AnimatedCounter target={80} inView={threatInView} />
              </div>
            </div>
            <div className="v8-threat-text-wrapper">
              <div className="v8-threat-rule"></div>
              <p className="v8-threat-desc">
                <ScrollRevealText
                  text="Of modern web traffic is encrypted, rendering legacy deep-packet inspection completely useless against sophisticated threats."
                  progress={threatWordPct}
                />
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3 — CAPABILITIES RIBBON */}
        <section className="v8-section v8-capabilities">
          <motion.div
            className="v8-cap-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="v8-cap-title">
              Engineered for absolute security.
            </h2>
          </motion.div>

          <div className="v8-cap-layout">
            {/* Card 1 */}
            <MagneticCard className="v8-cap-card v8-cap-large v8-interactive" delay={0.1}>
              <div className="v8-cap-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="v8-cap-card-title">Zero-Trust Hardware Binding</h3>
              <p className="v8-cap-card-desc">
                Every session is cryptographically bound to an authorized MAC
                address and device fingerprint. Unknown hardware gets dropped
                at the edge — no exceptions.
              </p>
            </MagneticCard>

            {/* Card 2 */}
            <MagneticCard className="v8-cap-card v8-cap-large v8-interactive" delay={0.25}>
              <div className="v8-cap-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="v8-cap-card-title">Real-Time Micro-Batching</h3>
              <p className="v8-cap-card-desc">
                Telemetry streams processed in millisecond micro-batches via
                XGBoost. Real-time risk scoring with zero persistent storage —
                data flows, never rests.
              </p>
            </MagneticCard>

            {/* Card 3 */}
            <MagneticCard className="v8-cap-card v8-cap-large v8-interactive" delay={0.4}>
              <div className="v8-cap-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="v8-cap-card-title">Privacy Preserving</h3>
              <p className="v8-cap-card-desc">
                We never intercept TLS handshakes or request certificates.
                P.A.R.S.E only analyzes the shape of traffic — never the
                contents. Your data stays yours.
              </p>
            </MagneticCard>
          </div>
        </section>

        {/* SECTION 4 — METRICS OBSERVATORY */}
        <section className="v8-section v8-metrics" ref={metricsRef}>
          <div className="v8-metrics-editorial">
            <motion.div
              className="v8-metrics-text-wrapper"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
            >
              <div className="v8-metrics-rule"></div>
              <p className="v8-metrics-desc">
                Of malware now hides inside encrypted channels to evade
                detection. We analyze the <span>shape</span> of traffic, not the
                contents — catching threats others can't even{' '}
                <span>see</span>.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20%' }}
              transition={{
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <MetricsRing value={68} inView={metricsInView} />
            </motion.div>
          </div>
        </section>

        {/* SECTION 5 — PORTAL CTA */}
        <section className="v8-section v8-portal">
          <div className="v8-portal-inner">
            <motion.h2
              className="v8-portal-title"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              Ready to see through
              <br />
              encryption?
            </motion.h2>

            <motion.p
              className="v8-portal-subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              Step into the engine room. Your network's truth awaits.
            </motion.p>

            <motion.div
              className="v8-magnetic-wrap v8-interactive"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.8, delay: 0.25 }}
            >
              <button className="v8-btn-portal" onClick={handleDive}>
                Launch P.A.R.S.E Engine
              </button>
            </motion.div>
          </div>

          <div className="v8-footer">
            © {new Date().getFullYear()} Team Terminal — SIH 2026
          </div>
        </section>
      </div>
    </div>
  );
}
