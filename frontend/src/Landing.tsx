import { useNavigate } from 'react-router-dom';
import { Shield, Activity, Lock, ArrowRight, BookOpen, Zap, Database } from 'lucide-react';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <Shield className="logo-icon" size={28} />
          <span>P.A.R.S.E</span>
        </div>
        <div className="nav-actions">
          <button className="btn-secondary" onClick={() => window.open('https://github.com', '_blank')}>
            <BookOpen size={18} /> Documentation
          </button>
          <button className="btn-glow" onClick={() => navigate('/app')}>
            Launch App <ArrowRight size={18} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge animate-fade-in-up">SIH26160 • Team Terminal</div>
          <h1 className="hero-title animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Unmask Encrypted Threats with <span className="text-gradient">Zero Decryption</span>.
          </h1>
          <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            A state-of-the-art Packet Analyser & Risk Scoring Engine. P.A.R.S.E uses deep behavioral metadata and XGBoost machine learning to classify network traffic with 93.6% accuracy—preserving privacy while exposing anomalies.
          </p>
          
          <div className="hero-cta animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <button className="btn-glow large" onClick={() => navigate('/app')}>
              Enter Dashboard
            </button>
            <button className="btn-secondary large">
              <BookOpen size={20} /> Read Documentation
            </button>
          </div>
        </div>

        {/* Floating Abstract Element */}
        <div className="hero-visual">
          <div className="cyber-sphere float-animation"></div>
          <div className="cyber-ring float-animation-delayed"></div>
        </div>
      </section>

      {/* Why it was built / Stats Section */}
      <section className="stats-section">
        <div className="section-header">
          <h2>The Visibility Gap</h2>
          <p>Why traditional Intrusion Detection Systems are failing.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card reveal">
            <div className="stat-icon"><Lock size={32} /></div>
            <div className="stat-number">80%</div>
            <div className="stat-text">Of all modern web traffic is fully encrypted, rendering traditional deep packet inspection completely blind to payloads.</div>
          </div>
          
          <div className="stat-card reveal" style={{ animationDelay: '0.1s' }}>
            <div className="stat-icon"><Activity size={32} /></div>
            <div className="stat-number">68%</div>
            <div className="stat-text">Of enterprise organizations report a critical lack of visibility into encrypted threats navigating through their networks.</div>
          </div>

          <div className="stat-card reveal" style={{ animationDelay: '0.2s' }}>
            <div className="stat-icon"><Zap size={32} /></div>
            <div className="stat-number">93.6%</div>
            <div className="stat-text">Our XGBoost ML accuracy in classifying traffic types (Video, Web, VoIP, ICMP) purely from behavioral packet statistics.</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="feature-grid">
          <div className="feature-item">
            <Database className="feature-icon" size={40} />
            <h3>Zero-Trust Hardware Binding</h3>
            <p>Admin access is physically bound to your device's MAC address at the database level. Impossible to spoof, preventing unauthorized traffic sniffing.</p>
          </div>
          <div className="feature-item">
            <Activity className="feature-icon" size={40} />
            <h3>Real-Time Micro-Batching</h3>
            <p>Continuous asynchronous packet capture processing guarantees real-time dashboard updates without blocking the main event loop.</p>
          </div>
          <div className="feature-item">
            <Shield className="feature-icon" size={40} />
            <h3>Privacy Preserving</h3>
            <p>Payloads are never decrypted. We analyze flow statistics, packet counts, and byte sizes, ensuring 100% compliance with data privacy laws.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2026 P.A.R.S.E | Developed for Smart India Hackathon</p>
      </footer>
    </div>
  );
}

export default Landing;
