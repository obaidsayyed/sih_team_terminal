import { motion, AnimatePresence } from 'motion/react';
import { Shield, Bot, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

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

interface DashboardStageProps {
  isRunning: boolean;
  isProcessing: boolean;
  loading: boolean;
  captureCooldown: number;
  progress: number;
  currentResult: PacketMetadata | null;
  startCapture: () => void;
  stopCapture: () => void;
  getRiskClass: (s: number) => string;
}

// Simple Rolling Number using Framer Motion
function RollingNumber({ value }: { value: number }) {
  const chars = value.toString().split('');
  return (
    <div style={{ display: 'flex', overflow: 'hidden' }} className="tabular-nums">
      {chars.map((ch, i) => (
        <AnimatePresence mode="popLayout" initial={false} key={i}>
          <motion.span
            key={ch}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ display: 'inline-block' }}
          >
            {ch}
          </motion.span>
        </AnimatePresence>
      ))}
    </div>
  );
}

export default function DashboardStage({
  isRunning,
  isProcessing,
  loading,
  captureCooldown,
  progress,
  currentResult,
  startCapture,
  stopCapture,
  getRiskClass,
}: DashboardStageProps) {
  const isStartDisabled = isRunning || loading || captureCooldown > 0;
  const isStopDisabled = !isRunning || loading;
  
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReportError, setAiReportError] = useState('');

  // Reset AI report when new results arrive
  useEffect(() => {
    setAiReport(null);
    setAiReportError('');
  }, [currentResult]);

  const generateAIReport = async () => {
    if (!currentResult) return;
    setIsGenerating(true);
    setAiReportError('');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is not configured in .env");
      }
      
      const prompt = `Analyze the following network packet metadata and provide a brief, professional cybersecurity risk assessment (max 3 short paragraphs).
      
      Traffic Type: ${currentResult.traffic_type}
      Packets Captured: ${currentResult.packet_count}
      Payload Size: ${(currentResult.pcap_size_bytes / 1024).toFixed(1)} KB
      IKE Packets: ${currentResult.ike_packet_count}
      ESP Packets: ${currentResult.esp_packet_count}
      Predicted Mode: ${currentResult.mode}
      Predicted Cipher: ${currentResult.cipher}
      Risk Score: ${currentResult.risk_score}/100
      
      Focus on whether this traffic appears anomalous, secure, or malicious.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to generate report');
      
      setAiReport(data.candidates[0].content.parts[0].text);
    } catch (err: any) {
      setAiReportError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStage = () => {
    if (isProcessing) {
      return (
        <motion.div
          key="processing"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="capture-stage"
        >
          <div className="stage-title">Processing Capture File...</div>
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ color: 'var(--label-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RollingNumber value={progress} />% Analyzed
          </div>
        </motion.div>
      );
    }

    if (isRunning) {
      return (
        <motion.div
          key="running"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="capture-stage"
        >
          <div className="stage-title">Sniffing Packets...</div>
          <div className="waveform">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </motion.div>
      );
    }

    if (currentResult) {
      const riskClass = getRiskClass(currentResult.risk_score);
      const riskLabel = currentResult.risk_score >= 70 ? 'High' : (currentResult.risk_score >= 40 ? 'Elevated' : 'Low');
      const isWarnType = ['icmp', 'voip'].includes(currentResult.traffic_type.toLowerCase());
      
      return (
        <motion.div
          key="result"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="capture-stage"
          style={{ justifyContent: 'flex-start' }}
        >
          <div className="stage-title">Latest Analysis Report</div>
          
          <div className="result-score-container">
            <div className={`result-score ${riskClass}`} style={{ 
              color: currentResult.risk_score >= 70 ? 'var(--red)' : currentResult.risk_score >= 40 ? 'var(--orange)' : 'var(--green)'
            }}>
              <RollingNumber value={currentResult.risk_score} />
            </div>
            
            <div className="range-bar">
              <motion.div 
                className="range-marker"
                initial={{ left: 0 }}
                animate={{ left: `calc(${currentResult.risk_score}% - 10px)` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
              />
            </div>
            <div style={{ color: 'var(--label-2)', fontSize: 15, fontWeight: 500 }}>
              Risk: {riskLabel}
            </div>
          </div>

          <motion.div 
            className="metric-group"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06 } }
            }}
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">Predicted Type</span>
              <span className="metric-value" style={{ color: isWarnType ? 'var(--orange)' : 'var(--label)', textTransform: 'uppercase' }}>
                {currentResult.traffic_type}
              </span>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">Packets Captured</span>
              <span className="metric-value tabular-nums">{currentResult.packet_count.toLocaleString()}</span>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">IKE / ESP Packets</span>
              <span className="metric-value tabular-nums">{currentResult.ike_packet_count.toLocaleString()} / {currentResult.esp_packet_count.toLocaleString()}</span>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">Predicted Mode</span>
              <span className="metric-value">{currentResult.mode !== 'N/A' && currentResult.mode !== 'live' ? currentResult.mode.toUpperCase() : 'N/A'}</span>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">Predicted Cipher</span>
              <span className="metric-value">{currentResult.cipher !== 'N/A' ? currentResult.cipher.toUpperCase().replace('-', ' ') : 'N/A'}</span>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">Payload Size</span>
              <span className="metric-value tabular-nums">{(currentResult.pcap_size_bytes / 1024).toFixed(1)} KB</span>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">Time Evaluated</span>
              <span className="metric-value">{new Date(currentResult.timestamp).toLocaleTimeString()}</span>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-2)', fontSize: 13, fontWeight: 600 }}>
                  <Bot size={16} /> Gemini AI Analysis
                </div>
                {!aiReport && (
                  <button 
                    onClick={generateAIReport} 
                    disabled={isGenerating}
                    style={{ 
                      background: isGenerating ? 'var(--bg-elev-3)' : 'var(--accent)', 
                      color: isGenerating ? 'var(--label-3)' : '#111', 
                      padding: '6px 12px', borderRadius: 12, 
                      fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}>
                          <Loader2 size={12} />
                        </motion.div>
                        Generating...
                      </>
                    ) : 'Generate'}
                  </button>
                )}
              </div>
              
              {aiReportError && (
                <div style={{ color: 'var(--red)', fontSize: 12, background: 'rgba(218, 54, 51, 0.1)', padding: 10, borderRadius: 8, width: '100%', textAlign: 'left' }}>
                  {aiReportError}
                </div>
              )}
              
              {aiReport && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  style={{ color: 'var(--label)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', textAlign: 'left', width: '100%', background: 'var(--bg-elev-1)', padding: 12, borderRadius: 8 }}
                >
                  {aiReport}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      );
    }

    // Idle
    return (
      <motion.div
        key="idle"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="capture-stage"
      >
        <div className="stage-title" style={{ color: 'var(--label)', fontSize: '20px', letterSpacing: '0.1em' }}>READY TO MONITOR</div>
        <Shield size={72} strokeWidth={1.5} color="var(--accent)" />
      </motion.div>
    );
  };

  const controls = (
    <>
      <button 
        className="btn-primary" 
        onClick={startCapture} 
        disabled={isStartDisabled}
        style={{ 
          flex: 1, height: 48, borderRadius: 24, 
          background: isStartDisabled ? 'var(--bg-elev-3)' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)',
          color: isStartDisabled ? 'var(--label-3)' : '#fff',
          fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em', border: 'none',
          boxShadow: isStartDisabled ? 'none' : '0 4px 12px rgba(224, 122, 95, 0.3)'
        }}
      >
        {captureCooldown > 0 ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            Wait <RollingNumber value={captureCooldown} />s...
          </span>
        ) : (
          "START CAPTURE"
        )}
      </button>
      <button 
        className="btn-primary" 
        onClick={stopCapture} 
        disabled={isStopDisabled}
        style={{ 
          flex: 1, height: 48, borderRadius: 24, 
          background: isStopDisabled ? 'var(--bg-elev-3)' : 'var(--red)',
          color: isStopDisabled ? 'var(--label-3)' : '#fff',
          fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em', border: 'none',
          boxShadow: isStopDisabled ? 'none' : '0 4px 12px rgba(218, 54, 51, 0.3)'
        }}
      >
        STOP & ANALYZE
      </button>
    </>
  );

  return (
    <>
      <div className="capture-widget">
        <div className="capture-controls desktop-controls">
          {controls}
        </div>
        <AnimatePresence mode="wait">
          {renderStage()}
        </AnimatePresence>
      </div>

      {/* Mobile Floating Bar */}
      <div className="mobile-bottom-bar glass">
        {controls}
      </div>
    </>
  );
}
