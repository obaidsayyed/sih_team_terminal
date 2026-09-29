import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldAlert, ShieldCheck, Shield, Activity, HardDrive, Clock, FileDigit, Bot, Loader2 } from 'lucide-react';
import Wallpaper from './components/Wallpaper';
import NodeBackground from './components/NodeBackground';
import './Dashboard.css'; // Reuse dashboard styles where possible

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const report = location.state?.report;
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReportError, setAiReportError] = useState('');

  const generateAIReport = async () => {
    setIsGenerating(true);
    setAiReportError('');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is not configured in .env");
      }
      
      const prompt = `Analyze the following network packet metadata and provide a brief, professional cybersecurity risk assessment (max 3 short paragraphs).
      
      Traffic Type: ${report.traffic_type}
      Packets Captured: ${report.packet_count}
      Payload Size: ${(report.pcap_size_bytes / 1024).toFixed(1)} KB
      IKE Packets: ${report.ike_packet_count}
      ESP Packets: ${report.esp_packet_count}
      Predicted Mode: ${report.mode}
      Predicted Cipher: ${report.cipher}
      Risk Score: ${report.risk_score}/100
      
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
                <Shield size={18} /> <span style={{ fontSize: 14, fontWeight: 600 }}>Mode / Cipher</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--label)', marginTop: 4, textTransform: 'uppercase' }}>
                {report.mode !== 'N/A' && report.mode !== 'live' ? report.mode : 'N/A'} / {report.cipher !== 'N/A' ? report.cipher.replace('-', ' ') : 'N/A'}
              </div>
            </div>

            <div className="metric-group" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-2)' }}>
                <Activity size={18} /> <span style={{ fontSize: 14, fontWeight: 600 }}>IKE / ESP Packets</span>
              </div>
              <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 600, color: 'var(--label)' }}>
                {report.ike_packet_count.toLocaleString()} / {report.esp_packet_count.toLocaleString()}
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

          <div className="metric-group" style={{ marginTop: 16, padding: 20 }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiReport ? 16 : 0 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-2)', fontSize: 14, fontWeight: 600 }}>
                 <Bot size={18} /> Gemini AI Analysis
               </div>
               {!aiReport && (
                 <button 
                   onClick={generateAIReport} 
                   disabled={isGenerating}
                   style={{ 
                     background: isGenerating ? 'var(--bg-elev-3)' : 'var(--accent)', 
                     color: isGenerating ? 'var(--label-3)' : '#111', 
                     padding: '8px 16px', borderRadius: 16, 
                     fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                   }}
                 >
                   {isGenerating ? (
                     <>
                       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}>
                         <Loader2 size={14} />
                       </motion.div>
                       Generating...
                     </>
                   ) : 'Generate Report'}
                 </button>
               )}
             </div>
             
             {aiReportError && (
               <div style={{ color: 'var(--red)', fontSize: 13, background: 'rgba(218, 54, 51, 0.1)', padding: 12, borderRadius: 8, marginTop: 16 }}>
                 {aiReportError}
               </div>
             )}
             
             {aiReport && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }} 
                 animate={{ opacity: 1, height: 'auto' }} 
                 style={{ color: 'var(--label)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
               >
                 {aiReport}
               </motion.div>
             )}
          </div>

        </motion.div>
        </div>
      </div>
    </Wallpaper>
  );
}
