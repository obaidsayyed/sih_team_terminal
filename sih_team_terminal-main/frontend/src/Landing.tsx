import { useNavigate } from 'react-router-dom';
import InteractiveBackground from './InteractiveBackground';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <InteractiveBackground />
      
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span>P.A.R.S.E</span>
        </div>
        <div className="nav-actions">
          <button className="btn-secondary" onClick={() => window.open('https://github.com', '_blank')}>
            Documentation
          </button>
          <button className="btn-primary" onClick={() => navigate('/app')}>
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Unmask Encrypted Threats with <span className="accent-text">Zero Decryption</span>.
          </h1>
          <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            A state-of-the-art Packet Analyser & Risk Scoring Engine. P.A.R.S.E uses deep behavioral metadata and XGBoost machine learning to classify network traffic with 93.6% accuracy—preserving privacy while exposing anomalies.
          </p>
          
          <div className="hero-cta animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <button className="btn-primary" onClick={() => navigate('/app')}>
              Enter Dashboard
            </button>
            <a href="#" className="btn-secondary">
              Read Documentation &gt;
            </a>
          </div>
        </div>

        {/* Floating Abstract Element */}
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orb">
            <div className="film-grain"></div>
          </div>
          <div className="glass-card-preview glass-preview-1">
            <div className="preview-stat tabular-nums">93.6%</div>
            <div style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Accuracy</div>
          </div>
          <div className="glass-card-preview glass-preview-2">
            <div style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '8px' }}>Traffic Classification</div>
            <div style={{ fontSize: '15px' }}>Video / Web / VoIP / ICMP</div>
          </div>
        </div>
      </section>

      {/* Why it was built / Stats Section */}
      <section className="stats-section">
        <div className="stats-inner">
          <div className="section-header">
            <h2>The Visibility Gap</h2>
            <p>Why traditional Intrusion Detection Systems are failing.</p>
          </div>

          <div className="bento-grid">
            <div className="bento-tile reveal">
              <div className="stat-number hero-stat">93.6%</div>
              <div className="stat-text">Our XGBoost ML accuracy in classifying traffic types (Video, Web, VoIP, ICMP) purely from behavioral packet statistics.</div>
            </div>
            
            <div className="bento-tile reveal" style={{ animationDelay: '100ms' }}>
              <div className="stat-number">80%</div>
              <div className="stat-text">Of all modern web traffic is fully encrypted, rendering traditional deep packet inspection completely blind to payloads.</div>
            </div>
            
            <div className="bento-tile reveal" style={{ animationDelay: '200ms' }}>
              <div className="stat-number">68%</div>
              <div className="stat-text">Of enterprise organizations report a critical lack of visibility into encrypted threats navigating through their networks.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section reveal">
        <div className="features-header">
          <h2>Engineered for absolute security.</h2>
        </div>
        
        <div className="feature-list">
          <div className="feature-list-item reveal">
            <div className="feature-num tabular-nums">01</div>
            <div className="feature-title">
              <h3>Zero-Trust<br/>Hardware Binding</h3>
            </div>
            <div className="feature-desc">
              <p>Admin access is physically bound to your device's MAC address at the database level. Impossible to spoof, preventing unauthorized traffic sniffing.</p>
            </div>
          </div>

          <div className="feature-list-item reveal" style={{ animationDelay: '100ms' }}>
            <div className="feature-num tabular-nums">02</div>
            <div className="feature-title">
              <h3>Real-Time<br/>Micro-Batching</h3>
            </div>
            <div className="feature-desc">
              <p>Continuous asynchronous packet capture processing guarantees real-time dashboard updates without blocking the main event loop.</p>
            </div>
          </div>

          <div className="feature-list-item reveal" style={{ animationDelay: '200ms' }}>
            <div className="feature-num tabular-nums">03</div>
            <div className="feature-title">
              <h3>Privacy<br/>Preserving</h3>
            </div>
            <div className="feature-desc">
              <p>Payloads are never decrypted. We analyze flow statistics, packet counts, and byte sizes, ensuring 100% compliance with data privacy laws.</p>
            </div>
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
