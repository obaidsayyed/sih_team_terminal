import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Server, Play, Square, Wifi } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

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
  
  // Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

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

      const { data: binding, error: bindError } = await supabase
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
        const { data: history, error: histError } = await supabase
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
      if (error) setAuthError(error.message);
      else setAuthError('Check your email for the confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
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
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await axios.post(`${API_BASE}/capture/start`, {}, { headers: { Authorization: `Bearer ${token}` }});
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
      await axios.post(`${API_BASE}/capture/stop`, {}, { headers: { Authorization: `Bearer ${token}` }});
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
          } else if (data.status === 'error') {
            clearInterval(pollProgress);
            setIsProcessing(false);
            setError(data.error_detail || "Analysis failed.");
            setLoading(false);
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
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading...</div>;
  }

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>P.A.R.S.E Auth</h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isSignUp && (
              <input 
                type="text" 
                placeholder="Full Name" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }}
              />
            )}
            <input 
              type="email" 
              placeholder="Email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }}
            />
            {authError && <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{authError}</div>}
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem' }}>
              {isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- NAME UPDATE FOR EXISTING USERS ---
  if (needsNameUpdate) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Action Required</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            We've updated our security policies. Please provide your full name to continue.
          </p>
          <form onSubmit={handleNameUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Enter your Full Name" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }}
            />
            {authError && <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{authError}</div>}
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem' }}>
              Save & Continue
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', textDecoration: 'underline' }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- HARDWARE VERIFICATION SCREEN ---
  if (macStatus !== 'authorized') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', textAlign: 'center' }}>
          {macStatus === 'loading' && <h2>Verifying Hardware Identity...</h2>}
          {macStatus === 'error' && <h2 style={{ color: 'var(--danger-color)' }}>Error connecting to local capture service. Is the backend running?</h2>}
          
          {(macStatus === 'unauthorized' || macStatus === 'unlinked' || macStatus === 'abandoned') && (
            <>
              <h1 style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>Unauthorized Hardware</h1>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
                Detected MAC: {currentMac}
              </div>
            </>
          )}

          {macStatus === 'unauthorized' && (
            <p>This physical device is bound to another user's account. Hardware sharing is strictly prohibited.</p>
          )}

          {macStatus === 'abandoned' && (
            <p style={{ color: 'var(--warning-color)' }}>
              Security Policy Violation: You have previously unlinked this device from your account. 
              Our Strict Hardware Policy states that left-off devices cannot be re-paired to the same account.
            </p>
          )}

          {macStatus === 'unlinked' && (
            <>
              <p style={{ marginBottom: '1rem' }}>This device is not linked to any account.</p>
              <div style={{ borderLeft: '4px solid var(--warning-color)', padding: '1rem', background: 'rgba(255, 170, 0, 0.1)', textAlign: 'left', marginBottom: '1.5rem' }}>
                <strong>Strict Policy Warning:</strong> Once you bind this device to your account, you will not be able to bind another one without unlinking this one. Furthermore, if you ever unlink this device, you can <em>never</em> pair it to this account again.
              </div>
              
              <a 
                href={`mailto:obaidalisayyed8055@gmail.com?subject=Device Shift Request - ${user.user_metadata?.name || 'User'}&body=Hello Obaid,%0D%0A%0D%0AI would like to register my new device.%0D%0A%0D%0AName: ${user.user_metadata?.name || ''}%0D%0AAccount Email: ${user.email}%0D%0ANew MAC Address: ${currentMac}%0D%0A%0D%0AThank you.`}
                className="btn-primary"
                style={{ display: 'inline-block', textDecoration: 'none', marginBottom: '1rem' }}
              >
                This is your New Device? Request Bind
              </a>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review takes up to 2 working days.</p>
            </>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button onClick={handleLogout} className="btn-danger">Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD (AUTHORIZED) ---
  return (
    <div>
      <header className="dashboard-header">
        <div>
          <h1>P.A.R.S.E</h1>
          <p>Welcome back, {user?.user_metadata?.name || 'Analyst'}</p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="status-indicator">
            <span style={{ color: isRunning ? 'var(--success-color)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              {isRunning ? <><Activity className="animate-pulse" /> Live Capture Active</> : <><Server /> System Idle</>}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-danger" style={{ padding: '0.5rem 1rem' }}>Log Out</button>
        </div>
      </header>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--danger-color)', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--danger-color)' }}>Error: {error}</p>
        </div>
      )}

      <div className="grid-container">
        {/* Controls & Main Status */}
        <div className="glass-card col-span-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <h2>Capture Controls</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-primary" 
                onClick={startCapture} 
                disabled={isRunning || loading}
              >
                <Play size={18} /> Start Capture
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

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            {isRunning ? (
              <div style={{ textAlign: 'center' }}>
                <Wifi size={64} style={{ color: 'var(--accent-color)', marginBottom: '1rem', animation: 'pulse 1.5s infinite alternate' }} />
                <h3>Sniffing Packets...</h3>
                <p>Click "Stop & Analyze" to process the capture.</p>
              </div>
            ) : isProcessing ? (
              <div style={{ textAlign: 'center', width: '80%' }}>
                <Activity size={48} style={{ color: 'var(--success-color)', marginBottom: '1.5rem', animation: 'pulse 1s infinite alternate' }} />
                <h3 style={{ marginBottom: '1.5rem' }}>Processing Capture File...</h3>
                <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-color), var(--success-color))', transition: 'width 0.3s ease' }}></div>
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>{progress}% Analyzed</p>
              </div>
            ) : currentResult ? (
              <div style={{ width: '100%' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Latest Analysis Report</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <div className="risk-meter">
                    <div className={`score-circle ${getRiskClass(currentResult.risk_score)} ${currentResult.risk_score >= 70 ? 'animate-pulse' : ''}`}>
                      {currentResult.risk_score}
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Risk Score</span>
                  </div>
                  
                  <div className="metrics-grid" style={{ flex: 1, marginLeft: '2rem' }}>
                    <div className="metric-item">
                      <div className="metric-value" style={{ color: currentResult.traffic_type === 'icmp' || currentResult.traffic_type === 'voip' ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                        {currentResult.traffic_type.toUpperCase()}
                      </div>
                      <div className="metric-label">Predicted Type</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value">{currentResult.packet_count}</div>
                      <div className="metric-label">Packets Captured</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value">{(currentResult.pcap_size_bytes / 1024).toFixed(1)} KB</div>
                      <div className="metric-label">Payload Size</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value">{new Date(currentResult.timestamp).toLocaleTimeString()}</div>
                      <div className="metric-label">Time Evaluated</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Activity size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <h3>Ready to Monitor</h3>
                <p>Press Start to begin a new packet capture session.</p>
              </div>
            )}
          </div>
        </div>

        {/* History Sidebar */}
        <div className="glass-card">
          <h2>Analysis History</h2>
          <div className="history-list">
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', marginTop: '2rem' }}>No history for this session.</p>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className={`history-item ${item.risk_score >= 70 ? 'risk-high' : item.risk_score >= 40 ? 'risk-med' : 'risk-low'}`}>
                  <div>
                    <div className="history-type">{item.traffic_type.toUpperCase()}</div>
                    <div className="history-time">{new Date(item.timestamp).toLocaleTimeString()}</div>
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
