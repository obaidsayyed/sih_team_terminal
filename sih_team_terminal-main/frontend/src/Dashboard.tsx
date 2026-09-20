import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Server, Play, Square, Wifi, Lock, User, Mail } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './auth.css';
import InteractiveBackground from './InteractiveBackground';

const API_BASE = 'http://localhost:8000/api';

interface PacketMetadata {
  config_id: string;
  traffic_type: string;
  packet_count: number;
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
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsNameUpdate, setNeedsNameUpdate] = useState(false);

  // Dashboard & Hardware State
  const [macStatus, setMacStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'unlinked' | 'abandoned' | 'error'>('loading');
  const [currentMac, setCurrentMac] = useState('');

  // Capture State
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<PacketMetadata | null>(null);
  const [history, setHistory] = useState<PacketMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (user) {
      verifyHardware();
    }
  }, [user]);

  useEffect(() => {
    if (user && macStatus === 'authorized') {
      checkStatus();

      const onFocus = () => {
        verifyHardware();
      };

      window.addEventListener('focus', onFocus);
      return () => {
        window.removeEventListener('focus', onFocus);
      };
    }
  }, [user, macStatus]);

  const verifyHardware = async () => {
    setMacStatus('loading');
    try {
      const res = await axios.get(`${API_BASE}/hardware-id`);
      const mac = res.data.mac_address;
      setCurrentMac(mac);

      const { data: binding } = await supabase
        .from('mac_bindings')
        .select('*')
        .eq('mac_address', mac)
        .maybeSingle();

      if (binding) {
        if (binding.user_id === user.id) {
          setMacStatus('authorized');
        } else {
          setMacStatus('unauthorized');
        }
      } else {
        const { data: history } = await supabase
          .from('mac_history')
          .select('*')
          .eq('mac_address', mac)
          .eq('user_id', user.id)
          .maybeSingle();

        if (history) {
          setMacStatus('abandoned');
        } else {
          setMacStatus('unlinked');
        }
      }
    } catch (err) {
      console.error("Failed to verify hardware:", err);
      setMacStatus('error');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authCooldown > 0) return;

    setAuthError('');
    if (isSignUp) {
      if (!name.trim()) {
        setAuthError('Name is required for sign up.');
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } }
      });
      if (error) {
        setAuthError(error.message);
        setAuthCooldown(3);
      } else {
        setAuthError('Check your email for the confirmation link!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        setAuthCooldown(3);
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
    await supabase.auth.signOut();
    setMacStatus('loading');
    navigate('/');
  };

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`);
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
      await axios.post(`${API_BASE}/capture/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setIsRunning(true);
      setCurrentResult(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start capture.");
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await axios.post(`${API_BASE}/capture/stop`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setIsRunning(false);

      setIsProcessing(true);
      setProgress(0);

      const pollProgress = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/progress`);
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

  if (authLoading) {
    return (
      <div className="auth-layout">
        <div className="status-icon-circle loading">
          <Activity size={32} />
        </div>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="auth-screen">
        <InteractiveBackground />
        <div className="auth-showcase">
          <h1>Secure Packet<br/>Analysis Engine</h1>
          <p>Next-generation network intelligence and real-time threat detection. Built for speed, designed for absolute security.</p>
        </div>
        <div className="auth-panel">
          <div className="auth-card-container">
            <div className="auth-body">
              <h2 className="auth-title">P.A.R.S.E Auth</h2>
              <form className="auth-form" onSubmit={handleAuth}>
                <div className="auth-group">
                  {isSignUp && (
                    <div className="auth-row--enter">
                      <div className="auth-row">
                        <div className="auth-icon-wrap" aria-hidden="true"><User size={20} strokeWidth={1.5} /></div>
                        <input
                          type="text"
                          placeholder="Full Name"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="auth-input"
                        />
                      </div>
                    </div>
                  )}
                  <div className="auth-row">
                    <div className="auth-icon-wrap" aria-hidden="true"><Mail size={20} strokeWidth={1.5} /></div>
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-row">
                    <div className="auth-icon-wrap" aria-hidden="true"><Lock size={20} strokeWidth={1.5} /></div>
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>
                {authError && <div className="auth-error" aria-live="polite">{authError}</div>}
                <button type="submit" className="auth-submit" disabled={authCooldown > 0}>
                  {isSignUp ? 'Sign Up' : 'Log In'}
                </button>
              </form>
            </div>
            <div className="auth-strip">
              <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="auth-strip-btn">
                {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- NAME UPDATE FOR EXISTING USERS ---
  if (needsNameUpdate) {
    return (
      <div className="auth-screen">
        <InteractiveBackground />
        <div className="auth-showcase">
          <h1>Account<br/>Verification</h1>
          <p>Please update your security profile to access the dashboard.</p>
        </div>
        <div className="auth-panel">
          <div className="auth-card-container">
            <div className="auth-body">
              <h2 className="auth-title">Action Required</h2>
              <p className="auth-note">
                We've updated our security policies. Please provide your full name to continue.
              </p>
              <form className="auth-form" onSubmit={handleNameUpdate}>
                <div className="auth-group">
                  <div className="auth-row">
                    <div className="auth-icon-wrap" aria-hidden="true"><User size={20} strokeWidth={1.5} /></div>
                    <input
                      type="text"
                      placeholder="Enter your Full Name"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>
                {authError && <div className="auth-error" aria-live="polite">{authError}</div>}
                <button type="submit" className="auth-submit">
                  Save & Continue
                </button>
              </form>
            </div>
            <div className="auth-strip">
              <button onClick={handleLogout} className="auth-strip-btn danger">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- HARDWARE VERIFICATION SCREEN ---
  if (macStatus !== 'authorized') {
    return (
      <div className="auth-layout">
        <div className="auth-backdrop-orb"></div>
        <div className="auth-card glass-panel" style={{ maxWidth: '600px', textAlign: 'center' }}>

          <div className={`status-icon-circle ${macStatus === 'loading' ? 'loading' :
              (macStatus === 'error' || macStatus === 'unauthorized' || macStatus === 'abandoned') ? 'danger' :
                'warning'
            }`}>
            {macStatus === 'loading' && <Activity size={32} />}
            {(macStatus === 'error' || macStatus === 'unauthorized' || macStatus === 'abandoned' || macStatus === 'unlinked') && <Lock size={32} />}
          </div>

          {macStatus === 'loading' && <h2>Verifying Hardware Identity...</h2>}
          {macStatus === 'error' && <h2 style={{ color: 'var(--danger-text)' }}>Error connecting to local capture service. Is the backend running?</h2>}

          {(macStatus === 'unauthorized' || macStatus === 'unlinked' || macStatus === 'abandoned') && (
            <>
              <h1 style={{ color: 'var(--danger-text)', marginBottom: '1rem', fontSize: '1.5rem' }}>Unauthorized Hardware</h1>
              <div className="mac-well">
                Detected MAC: {currentMac}
              </div>
            </>
          )}

          {macStatus === 'unauthorized' && (
            <p style={{ marginBottom: '1.5rem' }}>This physical device is bound to another user's account. Hardware sharing is strictly prohibited.</p>
          )}

          {macStatus === 'abandoned' && (
            <p style={{ color: 'var(--warning-text)', marginBottom: '1.5rem' }}>
              Security Policy Violation: You have previously unlinked this device from your account.
              Our Strict Hardware Policy states that left-off devices cannot be re-paired to the same account.
            </p>
          )}

          {macStatus === 'unlinked' && (
            <>
              <p style={{ marginBottom: '1rem' }}>This device is not linked to any account.</p>
              <div className="policy-callout">
                <strong>Strict Policy Warning:</strong> Once you bind this device to your account, you will not be able to bind another one without unlinking this one. Furthermore, if you ever unlink this device, you can <em>never</em> pair it to this account again.
              </div>

              <a
                href={`mailto:obaidalisayyed8055@gmail.com?subject=Device Shift Request - ${user.user_metadata?.name || 'User'}&body=Hello Obaid,%0D%0A%0D%0AI would like to register my new device.%0D%0A%0D%0AName: ${user.user_metadata?.name || ''}%0D%0AAccount Email: ${user.email}%0D%0ANew MAC Address: ${currentMac}%0D%0A%0D%0AThank you.`}
                className="btn-primary"
                style={{ display: 'inline-flex', marginBottom: '1rem' }}
              >
                This is your New Device? Request Bind
              </a>
              <p className="caption" style={{ textTransform: 'none' }}>Review takes up to 2 working days.</p>
            </>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleLogout} className="btn-danger">Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD (AUTHORIZED) ---
  return (
    <div className="dashboard-layout">
      {/* Noise overlay purely for texture on dashboard */}
      <svg className="sr-only" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
      </svg>
      <div className="noise-overlay" style={{ filter: 'url(#noiseFilter)', opacity: 0.02 }}></div>

      <header className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem' }}>P.A.R.S.E</h1>
          <p>Welcome back, {user?.user_metadata?.name || 'Analyst'}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className={`status-capsule ${isRunning ? 'active' : ''}`}>
            {isRunning ? (
              <><div className="live-dot"></div> Live Capture Active</>
            ) : (
              <><Server size={16} /> System Idle</>
            )}
          </div>
          <button onClick={handleLogout} className="btn-danger" style={{ background: 'transparent' }}>
            Log Out
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <p style={{ margin: 0, color: 'inherit' }}>Error: {error}</p>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Controls & Main Status */}
        <div className="card">
          <div className="controls-header">
            <h2>Capture Controls</h2>
            <div className="controls-actions">
              <button
                className="btn-primary"
                onClick={startCapture}
                disabled={isRunning || loading || captureCooldown > 0}
              >
                <Play size={18} /> {captureCooldown > 0 ? `Wait ${captureCooldown}s...` : 'Start Capture'}
              </button>
              <button
                className="btn-danger"
                onClick={stopCapture}
                disabled={!isRunning || loading}
              >
                <Square size={18} /> Stop & Analyze
              </button>
            </div>
          </div>

          <div className="stage-well">
            {isRunning ? (
              <div className="stage-state running">
                <div className="sniffing-container">
                  <div className="sniffing-ring"></div>
                  <div className="sniffing-ring"></div>
                  <div className="sniffing-ring"></div>
                  <Wifi size={32} style={{ color: 'var(--cobalt)', position: 'relative', zIndex: 2 }} />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Sniffing Packets...</h3>
                <p>Click "Stop & Analyze" to process the capture.</p>
              </div>
            ) : isProcessing ? (
              <div className="stage-state processing">
                <Activity size={32} style={{ color: 'var(--cobalt)', marginBottom: '1rem' }} />
                <h3>Processing Capture File...</h3>
                <div className="progress-container">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }}>
                      <div className="progress-sheen"></div>
                    </div>
                  </div>
                </div>
                <p className="tabular-nums">{progress}% Analyzed</p>
              </div>
            ) : currentResult ? (
              <div className="stage-state result">
                <h3 style={{ marginBottom: '2rem' }}>Latest Analysis Report</h3>
                <div className="result-container">
                  <div className="ring-gauge" style={{ '--score': currentResult.risk_score } as React.CSSProperties}>
                    <div className={`ring-gauge-value ${getRiskClass(currentResult.risk_score)}`}>
                      {currentResult.risk_score}
                    </div>
                    <div className="caption sr-only">Risk Score</div>
                  </div>

                  <div className="metrics-bento">
                    <div className="metric-tile">
                      <div className={`metric-value ${(currentResult.traffic_type === 'icmp' || currentResult.traffic_type === 'voip') ? 'warning-text' : ''}`}>
                        {currentResult.traffic_type.toUpperCase()}
                      </div>
                      <div className="caption">Predicted Type</div>
                    </div>
                    <div className="metric-tile">
                      <div className="metric-value tabular-nums">{currentResult.packet_count}</div>
                      <div className="caption">Packets Captured</div>
                    </div>
                    <div className="metric-tile">
                      <div className="metric-value tabular-nums">{(currentResult.pcap_size_bytes / 1024).toFixed(1)} KB</div>
                      <div className="caption">Payload Size</div>
                    </div>
                    <div className="metric-tile">
                      <div className="metric-value tabular-nums">{new Date(currentResult.timestamp).toLocaleTimeString()}</div>
                      <div className="caption">Time Evaluated</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="stage-state idle">
                <div className="idle-icon-tile">
                  <Activity size={32} />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Ready to Monitor</h3>
                <p>Press Start to begin a new packet capture session.</p>
              </div>
            )}
          </div>
        </div>

        {/* History Sidebar */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>Analysis History</h2>
          <div className="history-list">
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No history for this session.</p>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className={`history-item ${item.risk_score >= 70 ? 'risk-high' : item.risk_score >= 40 ? 'risk-med' : 'risk-low'}`}>
                  <div className="history-info">
                    <div className="status-dot"></div>
                    <div>
                      <div className="history-type">{item.traffic_type.toUpperCase()}</div>
                      <div className="history-time">{new Date(item.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <div className="history-score">{item.risk_score}/100</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
