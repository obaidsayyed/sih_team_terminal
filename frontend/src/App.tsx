import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ShieldAlert, ShieldCheck, Shield, Play, Square, Server, Wifi } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

interface PacketMetadata {
  config_id: string;
  traffic_type: string;
  packet_count: number;
  pcap_size_bytes: number;
  risk_score: number;
  timestamp: string;
}

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<PacketMetadata | null>(null);
  const [history, setHistory] = useState<PacketMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    // Start polling status if running
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`);
      setIsRunning(res.data.is_running);
    } catch (err) {
      // Backend might be offline
    }
  };

  const startCapture = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE}/capture/start`);
      setIsRunning(true);
      setCurrentResult(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start capture. Make sure backend is running as Administrator.");
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/capture/stop`);
      setIsRunning(false);
      setCurrentResult(res.data.data);
      setHistory(prev => [res.data.data, ...prev].slice(0, 50));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to stop capture");
    } finally {
      setLoading(false);
    }
  };

  const getRiskClass = (score: number) => {
    if (score >= 70) return 'score-danger';
    if (score >= 40) return 'score-warning';
    return 'score-safe';
  };

  return (
    <div>
      <header className="dashboard-header">
        <div>
          <h1>P.A.R.S.E</h1>
          <p>Packet Analyser & Risk Scoring Engine</p>
        </div>
        <div className="status-indicator">
          <span style={{ color: isRunning ? 'var(--success-color)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            {isRunning ? <><Activity className="animate-pulse" /> Live Capture Active</> : <><Server /> System Idle</>}
          </span>
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

export default App;
