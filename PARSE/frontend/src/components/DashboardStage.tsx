import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

interface PacketMetadata {
  config_id: string;
  traffic_type: string;
  packet_count: number;
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
              <span className="metric-label">Payload Size</span>
              <span className="metric-value tabular-nums">{(currentResult.pcap_size_bytes / 1024).toFixed(1)} KB</span>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="metric-row">
              <span className="metric-label">Time Evaluated</span>
              <span className="metric-value">{new Date(currentResult.timestamp).toLocaleTimeString()}</span>
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
        <div className="stage-title">Ready to Monitor</div>
        <Shield size={48} strokeWidth={1} color="var(--label-3)" />
      </motion.div>
    );
  };

  const controls = (
    <>
      <button 
        className="btn-primary" 
        onClick={startCapture} 
        disabled={isStartDisabled}
        style={{ flex: 1, height: 44, borderRadius: 22, background: 'var(--blue)' }}
      >
        {captureCooldown > 0 ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            Wait <RollingNumber value={captureCooldown} />s...
          </span>
        ) : (
          "Start Capture"
        )}
      </button>
      <button 
        className="btn-primary" 
        onClick={stopCapture} 
        disabled={isStopDisabled}
        style={{ flex: 1, height: 44, borderRadius: 22, background: 'var(--red)' }}
      >
        Stop & Analyze
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
