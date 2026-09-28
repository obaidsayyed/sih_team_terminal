import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldAlert, ShieldCheck, Shield, Activity, HardDrive, Clock, FileDigit } from 'lucide-react';
import Wallpaper from './components/Wallpaper';
import NodeBackground from './components/NodeBackground';
import './Dashboard.css'; // Reuse dashboard styles where possible

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const report = location.state?.report;

  if (!report) {
    return (
      <Wallpaper riskState="idle">
        <div className="screen-wrapper">
          <h2 style={{ color: 'var(--label)' }}>Report Not Found</h2>
          <button className="btn-primary" onClick={() => navigate('/app')} style={{ marginTop: 24, padding: '12px 24px', borderRadius: 24, background: 'var(--bg-elev-3)', color: '#fff' }}>
            Go Back
          </button>
        </div>
      </Wallpaper>
    );
  }

  const isDanger = report.risk_score >= 70;
  const isWarn = report.risk_score >= 40 && report.risk_score < 70;
  const riskLabel = isDanger ? 'High Risk' : isWarn ? 'Elevated Risk' : 'Low Risk';
  const riskState = isDanger ? 'danger' : isWarn ? 'warn' : 'safe';
  const pillColor = isDanger ? 'var(--red)' : isWarn ? 'var(--orange)' : 'var(--green)';

  return (
    <Wallpaper riskState={riskState}>
      <NodeBackground />
      <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header Elements */}
        <button 
          onClick={() => navigate('/app')} 
          style={{ 
            position: 'absolute', top: 32, left: 32,
            background: 'transparent', color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, padding: 0,
            zIndex: 10 
          }}
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        {/* Centered Content Container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          
          <div 
            className="dashboard-title" 
            style={{ marginBottom: 32 }}
          >
            Detailed Analysis Report
          </div>

          {/* Content */}
          <motion.div 
            className="capture-widget"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ width: '100%', maxWidth: 800, padding: 32 }}
          >
          {/* Risk Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            {isDanger ? <ShieldAlert size={64} color={pillColor} /> : isWarn ? <Shield size={64} color={pillColor} /> : <ShieldCheck size={64} color={pillColor} />}
            <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1, color: pillColor }}>
              {report.risk_score}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--label)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {riskLabel}
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="metric-group" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-2)' }}>
                <Activity size={18} /> <span style={{ fontSize: 14, fontWeight: 600 }}>Traffic Type</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--label)', textTransform: 'uppercase' }}>
                {report.traffic_type}
              </div>
            </div>

            <div className="metric-group" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-2)' }}>
                <FileDigit size={18} /> <span style={{ fontSize: 14, fontWeight: 600 }}>Packets Analyzed</span>
              </div>
              <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, color: 'var(--label)' }}>
                {report.packet_count.toLocaleString()}
              </div>
            </div>

            <div className="metric-group" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-2)' }}>
                <HardDrive size={18} /> <span style={{ fontSize: 14, fontWeight: 600 }}>Payload Size</span>
              </div>
              <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, color: 'var(--label)' }}>
                {(report.pcap_size_bytes / 1024).toFixed(1)} KB
              </div>
            </div>

            <div className="metric-group" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-2)' }}>
                <Clock size={18} /> <span style={{ fontSize: 14, fontWeight: 600 }}>Time Evaluated</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--label)', marginTop: 4 }}>
                {new Date(report.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="metric-group" style={{ marginTop: 16, padding: 20 }}>
             <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--label-2)', marginBottom: 8 }}>Configuration ID</div>
             <div className="mono" style={{ fontSize: 14, color: 'var(--label)' }}>{report.config_id}</div>
          </div>

        </motion.div>
        </div>
      </div>
    </Wallpaper>
  );
}
