import React, { useEffect, useRef } from 'react';

const LoadingScreen = () => {
  const dotsRef = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      dotsRef.current.forEach((dot, i) => {
        if (!dot) return;
        setTimeout(() => {
          dot.style.transform = 'translateY(-6px)';
          dot.style.opacity = '1';
          setTimeout(() => {
            if (dot) { dot.style.transform = 'translateY(0)'; dot.style.opacity = '0.3'; }
          }, 300);
        }, i * 120);
      });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#030308' }}>
      <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', width: 384, height: 384, background: '#5b5aff', opacity: 0.08, top: '20%', left: '30%' }} />
      <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', width: 256, height: 256, background: '#00c9a7', opacity: 0.06, bottom: '25%', right: '25%' }} />
      <div className="relative flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5b5aff 0%, #7b6aff 100%)', boxShadow: '0 0 40px rgba(91,90,255,0.4)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium" style={{ color: '#8888aa', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>SECUREVAULT</p>
        <div className="flex items-center gap-2">
          {[0,1,2].map(i => (
            <div key={i} ref={el => dotsRef.current[i] = el} className="w-1.5 h-1.5 rounded-full transition-all duration-300" style={{ background: '#5b5aff', opacity: 0.3 }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
