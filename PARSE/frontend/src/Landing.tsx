import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent, useInView } from 'motion/react';
import './landing/landing-v8.css';

import { bgStore } from './bgStore';

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
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
      // Ease out cubic
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

// Word-by-word reveal synced to scroll
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

// Animated SVG waveform
function EncryptedWaveform() {
  const points = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= 400; x += 2) {
      const y =
        100 +
        Math.sin(x * 0.05) * 30 +
        Math.sin(x * 0.12) * 15 +
        Math.sin(x * 0.03) * 25 +
        (Math.random() - 0.5) * 8;
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <svg className="v8-waveform" viewBox="0 0 400 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="v8-wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#6e3aff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <polyline className="v8-waveform-path" points={points} />
    </svg>
  );
}

// Radial ring chart
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
        <defs>
          <linearGradient id="v8-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a84ff" />
            <stop offset="100%" stopColor="#6e3aff" />
          </linearGradient>
        </defs>
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
      {/* Orbiting points */}
      <div className="v8-orbit-point" />
      <div className="v8-orbit-point" />
      <div className="v8-orbit-point" />
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

  // Scroll tracking
  const { scrollYProgress } = useScroll({ target: rootRef });
  const smoothProgress = useSpring(scrollYProgress, {
    damping: 20,
    stiffness: 100,
    mass: 0.5,
  });

  // Section refs for in-view
  const threatRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLElement>(null);
  const threatInView = useInView(threatRef, { once: false, margin: '-30%' });
  const metricsInView = useInView(metricsRef, { once: true, margin: '-30%' });

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Dive transition
  const handleDive = () => {
    setIsDiving(true);
    bgStore.setIsDiving(true);
    setTimeout(() => navigate('/app'), isReducedMotion ? 150 : 700);
  };

  useMotionValueEvent(smoothProgress, 'change', (v) => bgStore.setProgress(v));

  // Reset bgStore state when leaving the landing page (unless diving to keep the transition smooth)
  // Also reset diving state on mount in case we navigated back from /app
  useEffect(() => {
    bgStore.setIsDiving(false);
    
    return () => {
      if (!bgStore.isDiving) {
        bgStore.setProgress(0);
      }
    };
  }, []);

  // Threat section word reveal progress
  const threatWordProgress = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);
  const [threatWordPct, setThreatWordPct] = useState(0);
  useMotionValueEvent(threatWordProgress, 'change', (v) => setThreatWordPct(v));

  return (
    <div className="v8-root" ref={rootRef}>
      {/* Scroll progress bar */}
      <motion.div
        className="v8-scroll-progress"
        style={{ scaleX: smoothProgress }}
      />

      {/* Dive overlay */}
      <div className={`v8-dive-overlay ${isDiving ? 'v8-active' : ''}`} />

      {/* Background is now handled globally by App.tsx -> GlobalBackground.tsx */}
      {/* HTML CONTENT LAYER */}
      <div className="v8-content-layer">
        {/* NAV */}
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

        {/* ========================================================
            SECTION 1 — ORBITAL HERO
            ======================================================== */}
        <section className="v8-section v8-hero">
          <motion.div
            className="v8-hero-inner v8-interactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Character-reveal title */}
            <h1 className="v8-hero-title">
              {splitToChars('See Through')}
              <br />
              {splitToChars('Encryption.', 0.4 + 'See Through'.length * 0.035, true)}
            </h1>

            {/* Subtitle */}
            <p className="v8-hero-subtitle">
              The first network analysis engine that operates entirely on
              encrypted telemetry. No keys, no payloads — absolute privacy.
              <span className="v8-typewriter-cursor" />
            </p>

            {/* CTAs */}
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

          {/* Scroll hint */}
          <div className="v8-scroll-hint v8-interactive">
            <span className="v8-scroll-hint-text">Scroll</span>
            <span className="v8-scroll-hint-line" />
          </div>
        </section>

        {/* ========================================================
            SECTION 2 — THREAT TUNNEL
            ======================================================== */}
        <section className="v8-section v8-threat" ref={threatRef}>
          <motion.div
            className="v8-threat-left v8-interactive"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="v8-threat-stat tabular-nums">
              <AnimatedCounter
                target={80}
                inView={threatInView}
              />
            </div>
            <p className="v8-threat-desc">
              <ScrollRevealText
                text="Of modern web traffic is encrypted, rendering legacy deep-packet inspection completely useless against sophisticated threats."
                progress={threatWordPct}
              />
            </p>
          </motion.div>

          <motion.div
            className="v8-threat-right"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.15,
            }}
          >
            <EncryptedWaveform />
          </motion.div>
        </section>

        {/* ========================================================
            SECTION 3 — CAPABILITIES RIBBON
            ======================================================== */}
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

          <div className="v8-cap-cards">
            {/* Card 1 — Shield */}
            <motion.div
              className="v8-cap-card v8-interactive"
              initial={{ opacity: 0, x: -80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.1,
              }}
            >
              <div className="v8-cap-icon-wrap v8-icon-shield">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="v8-cap-card-title">
                Zero-Trust Hardware Binding
              </h3>
              <p className="v8-cap-card-desc">
                Every session is cryptographically bound to an authorized MAC
                address and device fingerprint. Unknown hardware gets dropped
                at the edge — no exceptions.
              </p>
            </motion.div>

            {/* Card 2 — Lightning */}
            <motion.div
              className="v8-cap-card v8-interactive"
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
            >
              <div className="v8-cap-icon-wrap v8-icon-bolt">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="v8-cap-card-title">
                Real-Time Micro-Batching
              </h3>
              <p className="v8-cap-card-desc">
                Telemetry streams processed in millisecond micro-batches via
                XGBoost. Real-time risk scoring with zero persistent storage —
                data flows, never rests.
              </p>
            </motion.div>

            {/* Card 3 — Lock */}
            <motion.div
              className="v8-cap-card v8-interactive"
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.3,
              }}
            >
              <div className="v8-cap-icon-wrap v8-icon-lock">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="v8-cap-card-title">Privacy Preserving</h3>
              <p className="v8-cap-card-desc">
                We never intercept TLS handshakes or request certificates.
                P.A.R.S.E only analyzes the shape of traffic — never the
                contents. Your data stays yours.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ========================================================
            SECTION 4 — METRICS OBSERVATORY
            ======================================================== */}
        <section className="v8-section v8-metrics" ref={metricsRef}>
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

          <motion.div
            className="v8-metrics-text"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.2,
            }}
          >
            <p className="v8-metrics-desc">
              Of malware now hides inside encrypted channels to evade
              detection. We analyze the <span>shape</span> of traffic, not the
              contents — catching threats others can't even{' '}
              <span>see</span>.
            </p>
          </motion.div>
        </section>

        {/* ========================================================
            SECTION 5 — PORTAL CTA
            ======================================================== */}
        <section className="v8-section v8-portal">
          <motion.h2
            className="v8-portal-title"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
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
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            <button className="v8-btn-portal" onClick={handleDive}>
              Launch P.A.R.S.E Engine
            </button>
          </motion.div>

          <div className="v8-footer">
            © {new Date().getFullYear()} Team Terminal — SIH 2026
          </div>
        </section>
      </div>
    </div>
  );
}
