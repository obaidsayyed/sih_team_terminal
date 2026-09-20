

export default function AuthWallpaper() {
  return (
    <div className="auth-wallpaper" aria-hidden="true">
      {/* Background radial highlight behind the card */}
      <div className="auth-highlight"></div>
      
      {/* Tint layer for error state reactivity */}
      <div className="auth-tint"></div>
      
      {/* Noise overlay */}
      <div className="auth-grain"></div>

      {/* FAR LAYER (blur 46px) */}
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="far-cobalt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8fbaff" />
            <stop offset="50%" stopColor="#0a5cff" />
            <stop offset="100%" stopColor="#4d92ff" />
          </linearGradient>
          <linearGradient id="far-coral" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffb39a" />
            <stop offset="50%" stopColor="#ff6b4a" />
            <stop offset="100%" stopColor="#ffb340" />
          </linearGradient>
        </defs>
        <g className="auth-ribbon-far">
          <path fill="url(#far-cobalt)" d="M -200 800 C 400 1100, 800 200, 1800 400 L 1800 1200 L -200 1200 Z" />
          <path fill="url(#far-coral)" d="M -200 200 C 600 -300, 1000 800, 1800 0 L 1800 -200 L -200 -200 Z" />
        </g>
      </svg>

      {/* MID LAYER (blur 7px) */}
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mid-amber" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffe0a8" />
            <stop offset="50%" stopColor="#ffb340" />
            <stop offset="100%" stopColor="#ff9a4a" />
          </linearGradient>
          <linearGradient id="mid-coral" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffc2ae" />
            <stop offset="100%" stopColor="#ff6b4a" />
          </linearGradient>
        </defs>
        <g className="auth-ribbon-mid">
          <path fill="url(#mid-amber)" d="M 1800 300 C 1000 700, 600 0, -200 200 L -200 -200 L 1800 -200 Z" />
          <path fill="url(#mid-coral)" d="M -200 600 C 500 300, 900 900, 1800 500 L 1800 1200 L -200 1200 Z" />
        </g>
      </svg>

      {/* NEAR LAYER (razor sharp satin) */}
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="near-cobalt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7fb0ff" />
            <stop offset="50%" stopColor="#1f6bff" />
            <stop offset="100%" stopColor="#0849cc" />
          </linearGradient>
          <linearGradient id="near-warm" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6b4a" />
            <stop offset="50%" stopColor="#ff9a4a" />
            <stop offset="100%" stopColor="#ffb340" />
          </linearGradient>
          {/* Satin sheen gradient */}
          <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="20%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="80%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          
          {/* Base paths defined in defs for reuse */}
          <path id="path-near-cobalt" d="M 600 -200 C 1000 300, 1300 700, 1800 1200 L 1800 -200 Z" />
          <path id="path-near-warm" d="M -200 1100 C 400 700, 1000 800, 1800 500 L 1800 1200 L -200 1200 Z" />
        </defs>
        
        <g className="auth-ribbon-near">
          {/* Cobalt Near Ribbon */}
          <use href="#path-near-cobalt" fill="url(#near-cobalt)" />
          <use href="#path-near-cobalt" fill="url(#sheen)" />
          <path d="M 600 -200 C 1000 300, 1300 700, 1800 1200" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.4" />
          
          {/* Warm Near Ribbon */}
          <use href="#path-near-warm" fill="url(#near-warm)" />
          <use href="#path-near-warm" fill="url(#sheen)" />
          <path d="M -200 1100 C 400 700, 1000 800, 1800 500" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
