import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { Server, Activity } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import DashboardStage from './components/DashboardStage';
import DashboardHistory from './components/DashboardHistory';
import Wallpaper from './components/Wallpaper';
import NodeBackground from './components/NodeBackground';
import './Dashboard.css';
const API_BASE = 'http://localhost:8000/api';

interface PacketMetadata {
  config_id: string;
  traffic_type: string;
  packet_count: number;
  ike_packet_count: number;
  esp_packet_count: number;
  mode: string;
  cipher: string;
  pcap_size_bytes: number;
  risk_score: number;
  timestamp: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsNameUpdate, setNeedsNameUpdate] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  // Dashboard & Session State
  const [sessionVerified, setSessionVerified] = useState(false);

  // Capture State
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<PacketMetadata | null>(null);
  const [history, setHistory] = useState<PacketMetadata[]>(() => {
    const saved = localStorage.getItem('parse_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  useEffect(() => {
    localStorage.setItem('parse_history', JSON.stringify(history));
  }, [history]);
  const [error, setError] = useState<string | null>(null);
  const [agentPopup, setAgentPopup] = useState(false);

  // Onboarding State
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    return localStorage.getItem('parse_onboarding_done') === 'true';
  });
  const [onboardingStep, setOnboardingStep] = useState(1);

  // Progress & Throttling State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [authCooldown, setAuthCooldown] = useState(0);
  const [captureCooldown, setCaptureCooldown] = useState(0);

  useEffect(() => {
    if (authCooldown > 0) {
      const timer = setTimeout(() => setAuthCooldown(authCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [authCooldown]);

  useEffect(() => {
    if (captureCooldown > 0) {
      const timer = setTimeout(() => setCaptureCooldown(captureCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [captureCooldown]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && !currentUser.user_metadata?.name) {
        setNeedsNameUpdate(true);
      } else {
        setNeedsNameUpdate(false);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && !currentUser.user_metadata?.name) {
        setNeedsNameUpdate(true);
      } else {
        setNeedsNameUpdate(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const verifySession = async () => {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    if (error || !currentUser) {
      handleLogout();
      return;
    }
    const localToken = localStorage.getItem('parse_session_token');
    const remoteToken = currentUser.user_metadata?.session_token;
    
    if (remoteToken && localToken && remoteToken !== localToken) {
      // Session hijacked or logged in from another device
      handleLogout();
    } else {
      setSessionVerified(true);
    }
  };

  useEffect(() => {
    if (user) {
      verifySession();
    }
  }, [user]);

  useEffect(() => {
    if (user && sessionVerified) {
      checkStatus();

      const onFocus = () => {
        verifySession();
      };

      window.addEventListener('focus', onFocus);
      return () => {
        window.removeEventListener('focus', onFocus);
      };
    }
  }, [user, sessionVerified]);

  const validateAuth = () => {
    if (!email.includes('@')) return "Email must contain '@'";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[!@#$%^&*(),.?":{}|<>\-_/\\+=\[\]]/.test(password)) return "Password must contain at least one symbol";

    if (isSignUp) {
      if (!username) return "Username is required";
      if (!name.trim()) return "Name is required";
      if (password !== confirmPassword) return "Passwords do not match";
      if (!/^\d{10}$/.test(mobileNo)) return "Mobile number must be exactly 10 digits";
    }
    return "";
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authCooldown > 0) return;

    setAuthError('');
    
    const validationError = validateAuth();
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim(), username: username.trim(), mobileNo } }
      });
      if (error) {
        setAuthError(error.message);
        setAuthCooldown(3);
      } else {
        setAuthError('Check your email for the confirmation link!');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        setAuthCooldown(3);
        setShakeTrigger(prev => prev + 1);
      } else if (data.user) {
        const sessionToken = crypto.randomUUID();
        localStorage.setItem('parse_session_token', sessionToken);
        await supabase.auth.updateUser({ data: { session_token: sessionToken } });
        setSessionVerified(true);
      }
    }
  };

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setAuthError('');
    const { data, error } = await supabase.auth.updateUser({
      data: { name: name.trim() }
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setUser(data.user);
      setNeedsNameUpdate(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('parse_session_token');
    await supabase.auth.signOut();
    setSessionVerified(false);
    navigate('/');
  };

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`, { timeout: 5000 });
      setIsRunning(res.data.is_running);
    } catch (err) {
      // Backend offline
    }
  };

  const startCapture = async () => {
    if (captureCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await axios.post(`${API_BASE}/capture/start`, {}, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      setIsRunning(true);
      setCurrentResult(null);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.detail?.includes("Local Agent connected")) {
        setAgentPopup(true);
      } else {
        setError(err.response?.data?.detail || "Failed to start capture.");
      }
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await axios.post(`${API_BASE}/capture/stop`, {}, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      setIsRunning(false);

      setIsProcessing(true);
      setProgress(0);

      const pollProgress = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/progress`, { timeout: 5000 });
          const data = res.data;

          setProgress(data.progress);

          if (data.status === 'completed') {
            clearInterval(pollProgress);
            setIsProcessing(false);
            setCurrentResult(data.result);
            setHistory(prev => [data.result, ...prev].slice(0, 50));
            setLoading(false);
            setCaptureCooldown(3);
          } else if (data.status === 'error') {
            clearInterval(pollProgress);
            setIsProcessing(false);
            setError(data.error_detail || "Analysis failed.");
            setLoading(false);
            setCaptureCooldown(3);
          }
        } catch (err) {
          console.error("Progress polling failed", err);
        }
      }, 500);

    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to stop capture");
      setLoading(false);
    }
  };

  const getRiskClass = (score: number) => {
    if (score >= 70) return 'score-danger';
    if (score >= 40) return 'score-warning';
    return 'score-safe';
  };

  const getRiskState = (): 'safe' | 'warn' | 'danger' | 'idle' => {
    if (!currentResult) return 'idle';
    if (currentResult.risk_score >= 70) return 'danger';
    if (currentResult.risk_score >= 40) return 'warn';
    return 'safe';
  };

  if (authLoading) {
    return (
      <Wallpaper riskState="idle">
        <div className="auth-layout">
          <div className="status-icon-circle loading">
            <Activity size={32} />
          </div>
        </div>
      </Wallpaper>
    );
  }

  // --- PRE-AUTH ONBOARDING ---
  if (!user && !hasSeenOnboarding) {
    return (
      <Wallpaper riskState="idle">
        <div className="auth-layout">
          <div className="onboarding-card">
            {onboardingStep === 1 ? (
              <>
                <h3 className="onboarding-title">Wireshark Required</h3>
                <p className="onboarding-desc">You must install Wireshark before you run this application.</p>
                <div className="onboarding-actions">
                  <a href="https://www.wireshark.org/download.html" target="_blank" rel="noreferrer" className="btn-download">
                    Download Wireshark
                  </a>
                  <button className="btn-next" onClick={() => setOnboardingStep(2)}>
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="onboarding-title">Download Local Agent</h3>
                <p className="onboarding-desc">Now, download the Local Agent and run it.</p>
                <p className="onboarding-hint">After downloading, run this agent by clicking twice and give it permissions to make changes to your device (Administrator permissions).</p>
                <div className="onboarding-actions">
                  <a href={`${API_BASE}/agent/download`} className="btn-download" download>
                    Download Agent
                  </a>
                  <button className="btn-next" onClick={() => {
                    localStorage.setItem('parse_onboarding_done', 'true');
                    setHasSeenOnboarding(true);
                  }}>
                    Continue to App
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Wallpaper>
    );
  }

  // --- LOGIN SCREEN & NAME UPDATE ---
  if (!user || needsNameUpdate) {
    return (
      <Wallpaper riskState="idle">
        <AuthScreen
          needsNameUpdate={needsNameUpdate}
          isSignUp={isSignUp}
          setIsSignUp={setIsSignUp}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          name={name}
          setName={setName}
          username={username}
          setUsername={setUsername}
          mobileNo={mobileNo}
          setMobileNo={setMobileNo}
          authError={authError}
          setAuthError={setAuthError}
          authCooldown={authCooldown}
          handleAuth={handleAuth}
          handleNameUpdate={handleNameUpdate}
          handleLogout={handleLogout}
          shakeTrigger={shakeTrigger}
        />
      </Wallpaper>
    );
  }

  // --- SESSION VERIFICATION OVERLAY ---
  if (!sessionVerified) {
    return (
      <Wallpaper riskState="idle">
        <div className="auth-layout">
          <div className="status-icon-circle loading">
            <Activity size={32} />
          </div>
        </div>
      </Wallpaper>
    );
  }

  // --- DASHBOARD (AUTHORIZED) ---
  return (
    <Wallpaper riskState={getRiskState()}>
      <NodeBackground />
      <div className="dashboard-root">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="dashboard-title">P.A.R.S.E</div>
            <div className="dashboard-welcome">Welcome back, {user?.user_metadata?.name || 'Analyst'}</div>
          </div>
          
          <motion.div 
            className="dynamic-island"
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <AnimatePresence mode="wait">
              {isRunning ? (
                <motion.div 
                  key="active"
                  className="island-content"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div className="island-live-dot" />
                  <span>Live Capture Active</span>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  className="island-content"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Server className="island-icon" size={14} />
                  <span>System Idle</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <button onClick={handleLogout} className="btn-logout">
            Log Out
          </button>
        </header>

        {error && (
          <div className="banner">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="dashboard-main">
          {agentPopup && (
            <div className="agent-popup-overlay">
              <div className="agent-popup">
                <h3>Agent Not Connected</h3>
                <p>Agent is not connected. Please connect to the local agent.</p>
                <p className="agent-popup-hint">After downloading, run this agent by clicking twice and give it permissions to make changes to your device (Administrator permissions).</p>
                <div className="agent-popup-actions">
                  <a href={`${API_BASE}/agent/download`} className="btn-download" download>
                    Download Agent
                  </a>
                  <button onClick={() => setAgentPopup(false)} className="btn-close">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <DashboardStage
            isRunning={isRunning}
            isProcessing={isProcessing}
            loading={loading}
            captureCooldown={captureCooldown}
            progress={progress}
            currentResult={currentResult}
            startCapture={startCapture}
            stopCapture={stopCapture}
            getRiskClass={getRiskClass}
          />
        </div>
        <DashboardHistory history={history} />
      </div>
    </Wallpaper>
  );
}

export default Dashboard;
