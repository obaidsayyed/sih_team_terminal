import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Globe, Phone, Film, Radio, Mail, HelpCircle, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PacketMetadata {
  config_id: string;
  traffic_type: string;
  packet_count: number;
  pcap_size_bytes: number;
  risk_score: number;
  timestamp: string;
}

interface DashboardHistoryProps {
  history: PacketMetadata[];
}

const typeConfig: Record<string, { icon: any, color: string }> = {
  web: { icon: Globe, color: 'var(--blue)' },
  voip: { icon: Phone, color: 'var(--orange)' },
  video: { icon: Film, color: 'var(--label)' },
  icmp: { icon: Radio, color: 'var(--red)' },
  email: { icon: Mail, color: 'var(--label)' },
  unknown: { icon: HelpCircle, color: 'var(--label-3)' },
};

export default function DashboardHistory({ history }: DashboardHistoryProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  const dragControls = useDragControls();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sheetProps = isMobile ? {
    drag: "y" as const,
    dragControls,
    dragConstraints: { top: -window.innerHeight * 0.8, bottom: 0 },
    dragElastic: 0.2,
    initial: { y: 0 },
    whileDrag: { cursor: 'grabbing' }
  } : {};

  return (
    <motion.aside 
      className="dashboard-sidebar"
      {...sheetProps}
      style={isMobile ? { touchAction: 'none' } : {}}
    >
      {isMobile && (
        <div 
          style={{ width: 36, height: 5, background: 'var(--bg-elev-3)', borderRadius: 2.5, margin: '0 auto 16px' }}
          onPointerDown={(e) => dragControls.start(e)}
        />
      )}
      
      <div className="history-title">Analysis History</div>
      
      <div className="history-list">
        {history.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--label-3)' }}>
            No history for this session.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {history.map((item) => {
              const config = typeConfig[item.traffic_type.toLowerCase()] || typeConfig.unknown;
              const Icon = config.icon;
              const isDanger = item.risk_score >= 70;
              const isWarn = item.risk_score >= 40 && item.risk_score < 70;
              const pillBg = isDanger ? 'var(--red-tint)' : (isWarn ? 'var(--orange-tint)' : 'var(--green-tint)');
              const pillColor = isDanger ? 'var(--red)' : (isWarn ? 'var(--orange)' : 'var(--green)');

              return (
                <motion.div
                  key={item.config_id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 60 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="history-item"
                >
                  <div className="hi-icon">
                    <Icon size={20} color={config.color} strokeWidth={1.5} />
                  </div>
                  <div className="hi-content">
                    <div className="hi-type">{item.traffic_type}</div>
                    <div className="hi-time">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="hi-pill" style={{ background: pillBg, color: pillColor }}>
                    {item.risk_score}/100
                  </div>
                  <ChevronRight className="hi-chevron" size={20} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.aside>
  );
}
