import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { CheckCircle, AlertTriangle, XCircle, Shield, Cpu } from 'lucide-react';

const SCAN_MESSAGES = [
  'Analyzing file structure…',
  'Checking signatures…',
  'Verifying integrity…',
  'Scanning heuristics…',
  'Cross-referencing database…',
];

const ScanOverlay = ({ fileName, isScanning, progress, result, onDismiss }) => {
  const overlayRef    = useRef(null);
  const ringOuterRef  = useRef(null);
  const ringInnerRef  = useRef(null);
  const ringPulseRef  = useRef(null);
  const shieldIconRef = useRef(null);
  const progressBarRef= useRef(null);
  const scanLineRef   = useRef(null);
  const resultCardRef = useRef(null);
  const waveRef       = useRef(null);
  const scanningTl    = useRef(null);
  const [displayPct,  setDisplayPct]  = useState(0);
  const [msgIdx,      setMsgIdx]      = useState(0);

  /* ── mount fade-in ── */
  useEffect(() => {
    gsap.set(overlayRef.current, { opacity: 0 });
    gsap.to(overlayRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' });
  }, []);

  /* ── scanning loop animations ── */
  useEffect(() => {
    if (!isScanning) return;
    gsap.to(ringOuterRef.current,  { rotation: 360,  duration: 8,  ease: 'none', repeat: -1 });
    gsap.to(ringInnerRef.current,  { rotation: -360, duration: 5,  ease: 'none', repeat: -1 });
    gsap.to(ringPulseRef.current,  { scale: 1.4, opacity: 0, duration: 1.6, ease: 'power1.out', repeat: -1 });
    gsap.to(shieldIconRef.current, { y: -6, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(scanLineRef.current,   {
      y: 170, opacity: 0, duration: 1.8, ease: 'none', repeat: -1,
      onRepeat: () => gsap.set(scanLineRef.current, { y: -170, opacity: 0.9 }),
    });

    /* rotate scan messages */
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % SCAN_MESSAGES.length), 1200);
    return () => {
      gsap.killTweensOf([ringOuterRef.current, ringInnerRef.current, ringPulseRef.current, shieldIconRef.current, scanLineRef.current]);
      clearInterval(msgTimer);
    };
  }, [isScanning]);

  /* ── wave bars ── */
  useEffect(() => {
    if (!isScanning || !waveRef.current) return;
    const bars = waveRef.current.querySelectorAll('.wave-bar');
    bars.forEach((bar, i) => {
      gsap.to(bar, {
        scaleY: Math.random() * 2.5 + 0.4,
        duration: 0.3 + Math.random() * 0.4,
        ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.05,
      });
    });
    return () => bars.forEach(bar => gsap.killTweensOf(bar));
  }, [isScanning]);

  /* ── progress counter ── */
  useEffect(() => {
    const obj = { val: displayPct };
    gsap.to(obj, {
      val: progress, duration: 0.6, ease: 'power1.out',
      onUpdate: () => setDisplayPct(Math.round(obj.val)),
    });
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, { width: `${progress}%`, duration: 0.6, ease: 'power1.out' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  /* ── result entrance ── */
  useEffect(() => {
    if (!result) return;
    gsap.killTweensOf([ringOuterRef.current, ringInnerRef.current, ringPulseRef.current, shieldIconRef.current, scanLineRef.current]);
    gsap.to([ringOuterRef.current, ringInnerRef.current], { rotation: '+=90', duration: 0.5, ease: 'power3.out' });
    if (resultCardRef.current) {
      gsap.fromTo(resultCardRef.current, { y: 28, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.4)', delay: 0.15 });
    }
    const timer = setTimeout(handleDismiss, 3500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const handleDismiss = () => {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => onDismiss?.() });
  };

  const resultConfig = {
    safe:    { color:'#00e5a0', glow:'rgba(0,229,160,0.35)',  ring:'rgba(0,229,160,0.5)',  bg:'rgba(0,229,160,0.07)',  icon:<CheckCircle  size={32} strokeWidth={1.8} style={{color:'#00e5a0'}} />, label:'No threats detected',      sub:'File is safe to use' },
    medium:  { color:'#ffc14d', glow:'rgba(255,193,77,0.35)', ring:'rgba(255,193,77,0.5)', bg:'rgba(255,193,77,0.07)', icon:<AlertTriangle size={32} strokeWidth={1.8} style={{color:'#ffc14d'}} />, label:'Potential risk detected',   sub:'Proceed with caution' },
    blocked: { color:'#ff4060', glow:'rgba(255,64,96,0.35)',  ring:'rgba(255,64,96,0.5)',  bg:'rgba(255,64,96,0.07)',  icon:<XCircle      size={32} strokeWidth={1.8} style={{color:'#ff4060'}} />, label:'File blocked',             sub:'Security threat detected' },
  };

  const cfg        = result ? resultConfig[result] : null;
  const scanColor  = '#5b5aff';

  return (
    <div ref={overlayRef} style={{
      position:'fixed', inset:0, zIndex:9999,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse at 50% 40%, rgba(15,12,40,0.98) 0%, rgba(4,4,12,0.99) 70%)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      fontFamily:"'Syne', sans-serif", overflow:'hidden',
    }}>
      {/* grid */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:`linear-gradient(rgba(91,90,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(91,90,255,0.04) 1px, transparent 1px)`,
        backgroundSize:'48px 48px',
        maskImage:'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
        WebkitMaskImage:'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
      }} />

      {/* corner brackets */}
      {[['top:28px','left:28px','borderTop','borderLeft'],['top:28px','right:28px','borderTop','borderRight'],['bottom:28px','left:28px','borderBottom','borderLeft'],['bottom:28px','right:28px','borderBottom','borderRight']].map(([p1,p2,b1,b2],i) => (
        <div key={i} style={{ position:'absolute', width:52, height:52, [p1.split(':')[0]]:p1.split(':')[1], [p2.split(':')[0]]:p2.split(':')[1], [b1]:'1px solid rgba(91,90,255,0.28)', [b2]:'1px solid rgba(91,90,255,0.28)', pointerEvents:'none' }} />
      ))}

      {/* ── Scanner rings ── */}
      <div style={{ position:'relative', width:260, height:260, marginBottom:36 }}>
        <div ref={ringPulseRef} style={{ position:'absolute', inset:0, borderRadius:'50%', border:`1px solid ${cfg ? cfg.ring : 'rgba(91,90,255,0.4)'}` }} />
        <div ref={ringOuterRef} style={{ position:'absolute', inset:4,  borderRadius:'50%', border:`1.5px dashed ${cfg ? cfg.ring : 'rgba(91,90,255,0.35)'}` }} />
        <div ref={ringInnerRef} style={{
          position:'absolute', inset:22, borderRadius:'50%',
          border:'2px solid transparent',
          borderTopColor:   cfg ? cfg.color : scanColor,
          borderRightColor: cfg ? cfg.color : scanColor,
          boxShadow: cfg ? `0 0 20px ${cfg.glow}` : '0 0 20px rgba(91,90,255,0.4)',
        }} />
        {/* concentric rings */}
        {[50, 80].map(n => (
          <div key={n} style={{ position:'absolute', inset:n, borderRadius:'50%', border:'1px solid rgba(91,90,255,0.07)' }} />
        ))}
        {/* glow */}
        <div style={{ position:'absolute', inset:40, borderRadius:'50%', background: cfg ? `radial-gradient(circle,${cfg.bg} 0%,transparent 70%)` : 'radial-gradient(circle,rgba(91,90,255,0.1) 0%,transparent 70%)', transition:'background 0.6s' }} />
        {/* scan line */}
        {!result && (
          <div ref={scanLineRef} style={{
            position:'absolute', left:44, right:44, top:'50%', height:2,
            background:`linear-gradient(90deg,transparent,${scanColor},transparent)`,
            opacity:0.9, borderRadius:1, pointerEvents:'none',
          }} />
        )}
        {/* center icon */}
        <div ref={shieldIconRef} style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {result
            ? cfg.icon
            : <Shield size={44} strokeWidth={1.2} style={{ color:scanColor, filter:'drop-shadow(0 0 12px rgba(91,90,255,0.6))' }} />
          }
        </div>
        {/* pct in ring */}
        {!result && (
          <div style={{ position:'absolute', bottom:26, left:0, right:0, textAlign:'center', fontSize:13, fontWeight:600, color:'rgba(91,90,255,0.9)', letterSpacing:'0.05em', fontFamily:'monospace' }}>
            {displayPct}%
          </div>
        )}
      </div>

      {/* ── Glass panel ── */}
      <div style={{
        width:'100%', maxWidth:420,
        borderRadius:20,
        background:'rgba(12,11,28,0.78)',
        border:`1px solid ${cfg ? cfg.ring : 'rgba(91,90,255,0.2)'}`,
        boxShadow: cfg ? `0 0 60px ${cfg.glow}, 0 24px 64px rgba(0,0,0,0.6)` : '0 0 40px rgba(91,90,255,0.12), 0 24px 64px rgba(0,0,0,0.6)',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        padding:'26px 30px', position:'relative', overflow:'hidden',
        transition:'border-color 0.6s, box-shadow 0.6s',
      }}>
        {/* top accent */}
        <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:1, background: cfg ? `linear-gradient(90deg,transparent,${cfg.color},transparent)` : `linear-gradient(90deg,transparent,${scanColor},transparent)`, transition:'background 0.6s' }} />

        <p style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color: cfg ? cfg.color : 'rgba(91,90,255,0.7)', marginBottom:7, fontWeight:600, transition:'color 0.6s' }}>
          {result ? 'SCAN COMPLETE' : 'DEEP SCAN ACTIVE'}
        </p>
        <h2 style={{ fontSize:21, fontWeight:700, color:'#e8e8ff', letterSpacing:'-0.02em', margin:'0 0 6px' }}>
          {result ? cfg.label : 'Scanning for threats…'}
        </h2>

        {/* animated scan message */}
        {!result && (
          <p style={{ fontSize:12, color:'rgba(200,200,230,0.5)', fontFamily:'monospace', marginBottom:18, minHeight:18, letterSpacing:'0.02em' }}>
            {SCAN_MESSAGES[msgIdx]}
          </p>
        )}

        {/* file name chip */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', borderRadius:10, background:'rgba(91,90,255,0.06)', border:'1px solid rgba(91,90,255,0.12)', marginBottom:18 }}>
          <Cpu size={13} style={{ color:'rgba(91,90,255,0.7)', flexShrink:0 }} />
          <span style={{ fontSize:12, color:'#c8c8e8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, fontFamily:'monospace', letterSpacing:'0.02em' }}>{fileName}</span>
        </div>

        {/* waveform */}
        {!result && (
          <div ref={waveRef} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, height:28, marginBottom:18 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="wave-bar" style={{
                width:3, height:10, borderRadius:2,
                background:`linear-gradient(to top,rgba(91,90,255,0.3),rgba(91,90,255,0.8))`,
                transformOrigin:'center bottom',
              }} />
            ))}
          </div>
        )}

        {/* progress bar */}
        {!result && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7, fontSize:10, color:'rgba(160,160,200,0.5)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
              <span>Analysis progress</span>
              <span style={{ color:scanColor, fontWeight:600 }}>{displayPct}%</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:'rgba(91,90,255,0.1)', overflow:'hidden', position:'relative' }}>
              <div ref={progressBarRef} style={{ position:'absolute', left:0, top:0, height:'100%', width:'0%', borderRadius:2, background:'linear-gradient(90deg,#5b5aff,#00c9a7)', boxShadow:'0 0 10px rgba(91,90,255,0.6)' }} />
            </div>
            {/* mini stats */}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, gap:8 }}>
              {[{ label:'Signatures', value:'2.4M' }, { label:'Heuristics', value:'Active' }, { label:'Deep scan', value:'On' }].map(({ label, value }) => (
                <div key={label} style={{ flex:1, textAlign:'center', padding:'7px 6px', borderRadius:8, background:'rgba(91,90,255,0.04)', border:'1px solid rgba(91,90,255,0.08)' }}>
                  <p style={{ fontSize:9, color:'rgba(160,160,200,0.45)', marginBottom:3, letterSpacing:'0.06em' }}>{label}</p>
                  <p style={{ fontSize:11, fontWeight:700, color:'#c8c8ff', letterSpacing:'0.02em' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* result card */}
        {result && (
          <div ref={resultCardRef} style={{ borderRadius:12, background:cfg.bg, border:`1px solid ${cfg.ring}`, padding:'15px 18px', display:'flex', alignItems:'center', gap:14, opacity:0 }}>
            {cfg.icon}
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:cfg.color, marginBottom:2 }}>{cfg.label}</p>
              <p style={{ fontSize:10, color:'rgba(200,200,230,0.45)', letterSpacing:'0.04em' }}>Scan complete · {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {result && (
          <button onClick={handleDismiss} style={{ marginTop:14, width:'100%', padding:'10px 0', borderRadius:10, border:`1px solid ${cfg.ring}`, background:cfg.bg, color:cfg.color, fontSize:12, fontWeight:600, cursor:'pointer', letterSpacing:'0.06em', fontFamily:"'Syne',sans-serif", transition:'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity='0.72'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}>
            {result === 'blocked' ? 'DISMISS' : 'CONTINUE'}
          </button>
        )}
      </div>

      <p style={{ position:'absolute', bottom:22, fontSize:10, color:'rgba(120,120,160,0.35)', letterSpacing:'0.15em', textTransform:'uppercase', fontFamily:'monospace' }}>
        SecureVault · AES-256 · Real-time Threat Detection
      </p>
    </div>
  );
};

export default ScanOverlay;
