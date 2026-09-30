import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NodeBackground from './NodeBackground';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';
import Vault from './Vault';
import './AuthScreen.css';

const IconMail = ({ size = 20, className = "", style }: { size?: number, className?: string, style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className={className} style={style}>
    <rect x="2" y="4" width="20" height="16" />
    <path d="M2 6l10 7 10-7" />
  </svg>
);

const IconLock = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className={className}>
    <rect x="5" y="11" width="14" height="10" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

const IconUser = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className={className}>
    <circle cx="12" cy="7" r="4" />
    <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
  </svg>
);

const IconPhone = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className={className}>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <line x1="12" y1="18" x2="12" y2="18" />
  </svg>
);

const IconEye = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

interface AuthScreenProps {
  needsNameUpdate: boolean;
  isSignUp: boolean;
  setIsSignUp: (b: boolean) => void;
  email: string;
  setEmail: (s: string) => void;
  password: string;
  setPassword: (s: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (s: string) => void;
  name: string;
  setName: (s: string) => void;
  username?: string;
  setUsername?: (s: string) => void;
  mobileNo?: string;
  setMobileNo?: (s: string) => void;
  authError: string;
  setAuthError: (s: string) => void;
  authCooldown: number;
  handleAuth: (e: React.FormEvent) => void;
  handleNameUpdate: (e: React.FormEvent) => void;
  handleLogout: () => void;
  shakeTrigger: number;
}

function CameraRig({ isSignUp, isShaking, isOpening, signupPhase }: { isSignUp: boolean, isShaking: boolean, isOpening: boolean, signupPhase: string }) {
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    // Base target position
    let targetX = 0;
    let targetY = 0;
    let targetZ = 16;
    
    if (signupPhase === 'retracting' || signupPhase === 'sealed') {
      // Subtle push-in while maintaining full vault frame
      targetX = 0;
      targetY = 0;
      targetZ = 15;
    } else if (signupPhase === 'popup') {
      // Return to exact resting/idle framing for popup overlay
      targetX = 0;
      targetY = 0;
      targetZ = 16;
    } else if (isOpening) {
      // successful login push in closer
      targetX = 0;
      targetY = 0;
      targetZ = 10;
    } else if (isSignUp && signupPhase === 'idle') {
      // Keep centered so the recessed UI stays perfectly aligned with the vault door
      targetX = 0;
      targetY = 0;
      targetZ = 14;
    }
    
    // Add sympathetic shake
    if (isShaking) {
      targetX += Math.sin(time * 60) * 0.05;
      targetY += Math.cos(time * 60) * 0.05;
    }

    // Use damp for smooth eased transitions (intro, tab switch, etc.)
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, targetX, 3, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetY, 3, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetZ, 3, delta);
    
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function AuthScreen({
  needsNameUpdate,
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  name,
  setName,
  username,
  setUsername,
  mobileNo,
  setMobileNo,
  authError,
  setAuthError,
  authCooldown,
  handleAuth,
  handleNameUpdate,
  handleLogout,
  shakeTrigger
}: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [signupPhase, setSignupPhase] = useState<'idle' | 'retracting' | 'sealed' | 'popup'>('idle');
  const [localIsShaking, setLocalIsShaking] = useState(false);

  useEffect(() => {
    if (shakeTrigger > 0) {
      setLocalIsShaking(true);
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      const t = setTimeout(() => setLocalIsShaking(false), 500);
      return () => clearTimeout(t);
    }
  }, [shakeTrigger]);

  useEffect(() => {
    if (authError === 'Check your email for the confirmation link!') {
      setIsOpening(false);
      setSignupPhase('retracting');
      setTimeout(() => {
        setSignupPhase('sealed');
        setTimeout(() => {
          setSignupPhase('popup');
        }, 1500);
      }, 500);
    } else if (authError) {
      setSignupPhase('idle');
      setIsOpening(false);
    } else {
      setSignupPhase('idle');
    }
  }, [authError]);

  const handleAuthVisual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUp && email && password) {
      setIsOpening(true);
    }
    if (needsNameUpdate) {
      handleNameUpdate(e);
    } else {
      handleAuth(e);
    }
  };

  const handleTabSwitch = (signUp: boolean) => {
    setAuthError('');
    setIsSignUp(signUp);
    setEmail('');
    setPassword('');
    if (setConfirmPassword) setConfirmPassword('');
    setName('');
    if (setUsername) setUsername('');
    if (setMobileNo) setMobileNo('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const isSignupSuccess = signupPhase !== 'idle';

  return (
    <div className="screen-wrapper auth-root">
      <NodeBackground />
      <div className="vault-container">
        <Canvas camera={{ position: [0, 0, 15], fov: 30 }}>
          <Suspense fallback={null}>
            <Environment preset="studio" />
            <ambientLight intensity={0.2} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-5, 2, 2]} intensity={0.5} />
            <directionalLight position={[0, 5, -5]} intensity={2} />
            
            <Vault 
              isOpen={(isSignUp && !isSignupSuccess) || (!isSignUp && isOpening)} 
              isShaking={localIsShaking} 
            />
            
            <ContactShadows position={[0, -3.5, 0]} opacity={0.7} scale={15} blur={2.5} far={4} color="#000000" />
            <CameraRig 
              isSignUp={isSignUp} 
              isShaking={localIsShaking} 
              isOpening={isOpening} 
              signupPhase={signupPhase} 
            />
          </Suspense>
        </Canvas>
      </div>

      <AnimatePresence mode="wait">
        {signupPhase !== 'sealed' && signupPhase !== 'popup' && (
          <motion.div
            className={`auth-sheet glass ${isSignUp ? 'mode-signup' : 'mode-login'} ${localIsShaking ? 'shake' : ''}`}
            key="auth-form"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={
              signupPhase === 'retracting'
                ? { opacity: 0, scale: 0.4, y: 0, filter: 'blur(10px)' }
                : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
            }
            exit={{ opacity: 0, scale: 0.4, filter: 'blur(10px)' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
        <div className="auth-header">
          <motion.div layout>
            <h1 className="auth-title">P.A.R.S.E Console</h1>
            <p className="auth-subtitle">
              {needsNameUpdate 
                ? "Please provide your full name to continue." 
                : "Enter your credentials to access the engine."}
            </p>
          </motion.div>

          {!needsNameUpdate && (
            <div className="auth-tabs">
              <motion.div
                className="tab-indicator"
                initial={false}
                animate={{
                  left: isSignUp ? '50%' : '0%',
                  width: '50%'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              <button
                type="button"
                className={`auth-tab ${!isSignUp ? 'active' : ''}`}
                onClick={() => handleTabSwitch(false)}
              >
                Log In
              </button>
              <button
                type="button"
                className={`auth-tab ${isSignUp ? 'active' : ''}`}
                onClick={() => handleTabSwitch(true)}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleAuthVisual}>
          <motion.div layout className="fields-container inset-group" style={{ gap: 20 }}>
            <AnimatePresence initial={false}>
              {(isSignUp || needsNameUpdate) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div className="auth-field-grid">
                    <div>
                      <label className="field-label">Username</label>
                      <div className="inset-row">
                        <IconUser className="row-icon" size={18} />
                        <input
                          type="text"
                          placeholder="e.g. Neo"
                          value={username || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[a-zA-Z\s]*$/.test(val) && setUsername) setUsername(val);
                          }}
                          disabled={authCooldown > 0}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="field-label">Full Name</label>
                      <div className="inset-row">
                        <IconUser className="row-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Thomas A. Anderson"
                          value={name}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[a-zA-Z\s]*$/.test(val)) setName(val);
                          }}
                          disabled={authCooldown > 0}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Mobile Number</label>
                    <div className="inset-row">
                      <IconPhone className="row-icon" size={18} />
                      <input
                        type="text"
                        placeholder="Enter phone number"
                        value={mobileNo || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d{0,10}$/.test(val) && setMobileNo) setMobileNo(val);
                        }}
                        disabled={authCooldown > 0}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!needsNameUpdate && (
              <>
                <div>
                  <label className="field-label">Email Address</label>
                  <div className="inset-row">
                    <IconMail className="row-icon" size={18} />
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={authCooldown > 0}
                      required
                    />
                  </div>
                </div>

                <div className={isSignUp ? 'auth-field-grid' : 'auth-field-col'}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label className="field-label">Password</label>
                    <div className="inset-row">
                      <IconLock className="row-icon" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={authCooldown > 0}
                        required
                      />
                      <button 
                        type="button" 
                        className="eye-btn" 
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence initial={false}>
                    {isSignUp && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "100%", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <div>
                          <label className="field-label">Confirm Password</label>
                          <div className="inset-row">
                            <IconLock className="row-icon" size={18} />
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={confirmPassword || ''}
                              onChange={(e) => setConfirmPassword && setConfirmPassword(e.target.value)}
                              disabled={authCooldown > 0}
                              required={isSignUp}
                            />
                            <button 
                              type="button" 
                              className="eye-btn" 
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>

          <motion.div layout className="auth-actions" style={{ marginTop: 16 }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={authCooldown > 0 || (!needsNameUpdate && (!email || !password))}
            >
              {needsNameUpdate ? "Save & Continue" : (isSignUp ? "Create Account" : "Access Engine")}
              {authCooldown > 0 && <div className="drain-fill" key={authCooldown} />}
            </button>

            {needsNameUpdate && (
              <button type="button" className="btn-danger-plain" onClick={handleLogout}>
                Sign Out
              </button>
            )}
          </motion.div>
        </form>

        <div className="auth-error" aria-live="polite">
          <AnimatePresence mode="wait">
            {authError && (
              <motion.div
                key={authError}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {authError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      )}

      {signupPhase === 'popup' && (
        <motion.div
          key="popup"
          className="auth-sheet glass mode-login"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            margin: 'auto',
            width: '100%',
            maxWidth: '420px',
            height: 'fit-content',
            padding: '40px 32px',
            textAlign: 'center',
            borderRadius: '40px 12px 40px 12px',
            border: '1px solid var(--accent)',
            background: 'rgba(14, 17, 22, 0.75)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(68, 201, 216, 0.2)'
          }}
        >
          <IconMail size={48} style={{ color: 'var(--accent)', margin: '0 auto 20px', display: 'block' }} />
          <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Account Secured
          </h2>
          <p style={{ color: 'var(--label-3)', fontSize: 13, marginBottom: 32, lineHeight: 1.6 }}>
            {authError || 'Check your email for the confirmation link to initialize your cryptographic keys.'}
          </p>
          <button 
            className="btn-primary" 
            onClick={() => {
              setAuthError('');
              setIsSignUp(false);
              setSignupPhase('idle');
            }}
            style={{ width: '100%' }}
          >
            OK, got it
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
