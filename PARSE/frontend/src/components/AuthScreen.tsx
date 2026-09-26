import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import './AuthScreen.css';

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
  handleLogout
}: AuthScreenProps) {
  const [shakeKey, setShakeKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (authError) {
      setShakeKey(prev => prev + 1);
    }
  }, [authError]);

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

  return (
    <div className="screen-wrapper auth-root">
      <motion.div
        className={`auth-sheet glass ${authError ? 'shake' : ''}`}
        key={shakeKey}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
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

        <form onSubmit={needsNameUpdate ? handleNameUpdate : handleAuth}>
          <motion.div layout className="inset-group">
            <AnimatePresence initial={false}>
              {(isSignUp || needsNameUpdate) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="inset-row" style={{ marginBottom: 8 }}>
                    <User className="row-icon" size={20} strokeWidth={1.75} />
                    <input
                      type="text"
                      placeholder="Username"
                      value={username || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[a-zA-Z\s]*$/.test(val) && setUsername) setUsername(val);
                      }}
                      disabled={authCooldown > 0}
                    />
                  </div>
                  <div className="inset-row" style={{ marginBottom: 8 }}>
                    <User className="row-icon" size={20} strokeWidth={1.75} />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[a-zA-Z\s]*$/.test(val)) setName(val);
                      }}
                      disabled={authCooldown > 0}
                    />
                  </div>
                  <div className="inset-row" style={{ marginBottom: 8 }}>
                    <Phone className="row-icon" size={20} strokeWidth={1.75} />
                    <input
                      type="text"
                      placeholder="Mobile Number"
                      value={mobileNo || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d{0,10}$/.test(val) && setMobileNo) setMobileNo(val);
                      }}
                      disabled={authCooldown > 0}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!needsNameUpdate && (
              <>
                <div className="inset-row" style={{ marginBottom: 8 }}>
                  <Mail className="row-icon" size={20} strokeWidth={1.75} />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={authCooldown > 0}
                    required
                  />
                </div>
                <div className="inset-row">
                  <Lock className="row-icon" size={20} strokeWidth={1.75} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
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
                    {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {isSignUp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="inset-row" style={{ marginTop: 8 }}>
                        <Lock className="row-icon" size={20} strokeWidth={1.75} />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm Password"
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
                          {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>

          <motion.div layout className="auth-actions" style={{ marginTop: 24 }}>
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
    </div>
  );
}
