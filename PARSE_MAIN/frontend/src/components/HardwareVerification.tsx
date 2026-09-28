import { motion } from 'motion/react';
import './HardwareVerification.css';

interface HardwareVerificationProps {
  macStatus: 'loading' | 'authorized' | 'unauthorized' | 'unlinked' | 'abandoned' | 'error';
  currentMac: string;
  user: any;
  handleLogout: () => void;
}

export default function HardwareVerification({ macStatus, currentMac, user, handleLogout }: HardwareVerificationProps) {
  // Icon removed per user request

  const getTitle = () => {
    switch (macStatus) {
      case 'loading': return "Verifying Identity";
      case 'unlinked': return "Action Required";
      case 'unauthorized': return "Unauthorized Hardware";
      case 'abandoned': return "Hardware Abandoned";
      case 'error': return "Verification Error";
      default: return "";
    }
  };

  const getDesc = () => {
    switch (macStatus) {
      case 'loading': return "Please wait while we verify this machine's cryptographic signature.";
      case 'unlinked': return "This machine has not been linked to your account. P.A.R.S.E employs strict 1:1 hardware binding for packet capture authorization.";
      case 'unauthorized': return "This machine is currently registered to another analyst. You cannot capture packets on a machine you do not own.";
      case 'abandoned': return "This MAC address was previously linked but has been abandoned. It cannot be re-paired to this account for security reasons.";
      case 'error': return "The backend service is unreachable or the Npcap interface could not be queried.";
      default: return "";
    }
  };

  const showMailto = macStatus === 'unlinked';

  // Format explicitly for Gmail composition window
  const subject = encodeURIComponent(`PARSE Binding Request: ${user?.user_metadata?.name || user?.email || ''}`);
  const body = encodeURIComponent(`Please link the following MAC to my account:\n\nEmail: ${user?.email}\nMAC: ${currentMac}`);
  const mailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=obiadalisayyed8055@gmail.com&su=${subject}&body=${body}`;

  return (
    <div className="screen-wrapper hv-root">
      <motion.div 
        className="hv-apple-card"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="hv-apple-content">
          <h2 className="hv-apple-title">{getTitle()}</h2>
          <p className="hv-apple-desc">{getDesc()}</p>
          
          {macStatus !== 'loading' && (
            <div className="hv-apple-mac-container">
              <div className="hv-apple-mac-label">Detected Hardware MAC</div>
              <div className="hv-apple-mac-value mono">{currentMac || 'UNKNOWN'}</div>
            </div>
          )}

          {macStatus !== 'loading' && (
            <div className="hv-apple-warning">
              <strong>Zero-Trust Policy</strong>
              <p>Network capture is strictly prohibited until a system administrator manually verifies and binds this hardware.</p>
            </div>
          )}
        </div>

        <div className="hv-apple-actions">
          {showMailto && (
            <a 
              href={mailUrl}
              target="_blank"
              rel="noreferrer"
              className="hv-apple-btn-primary"
            >
              Request Hardware Bind
            </a>
          )}
          {macStatus !== 'loading' && (
            <button onClick={handleLogout} className="hv-apple-btn-secondary">
              Sign Out
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
