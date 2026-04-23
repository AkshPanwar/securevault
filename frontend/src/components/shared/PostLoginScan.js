import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Shield, CheckCircle, Cpu, Wifi, Lock } from 'lucide-react';

const SCAN_STEPS = [
  { text: 'Initializing secure environment…', icon: Cpu, duration: 600 },
  { text: 'Establishing encrypted channel…', icon: Wifi, duration: 700 },
  { text: 'Scanning for active threats…', icon: Shield, duration: 800 },
  { text: 'Verifying system integrity…', icon: Lock, duration: 600 },
  { text: 'Loading secure vault…', icon: Shield, duration: 500 },
];

const PostLoginScan = ({ onComplete }) => {
  const overlayRef   = useRef(null);
  const radarRef     = useRef(null);
  const sweepRef     = useRef(null);
  const ring1Ref     = useRef(null);
  const ring2Ref     = useRef(null);
  const ring3Ref     = useRef(null);
  const barFillRef   = useRef(null);
  const dotRef       = useRef(null);
  const resultRef    = useRef(null);
  const canvasRef    = useRef(null);

  const [stepIdx,    setStepIdx]   = useState(0);
  const [pct,        setPct]       = useState(0);
  const [done,       setDone]      = useState(false);

  /* ── particle canvas ─────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      o: Math.random() * 0.35 + 0.05,
    }));
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(91,90,255,${p.o})`;
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(91,90,255,${0.07 * (1 - d / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* ── mount fade-in ───────────────────────────────────── */
  useEffect(() => {
    gsap.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' }
    );
  }, []);

  /* ── radar rings spin ────────────────────────────────── */
  useEffect(() => {
    gsap.to(ring1Ref.current, { rotation: 360,  duration: 10, ease: 'none', repeat: -1 });
    gsap.to(ring2Ref.current, { rotation: -360, duration: 7,  ease: 'none', repeat: -1 });
    gsap.to(ring3Ref.current, { rotation: 360,  duration: 14, ease: 'none', repeat: -1 });
    gsap.to(dotRef.current,   { scale: 1.4, opacity: 0.4, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    /* radar sweep */
    gsap.to(sweepRef.current, { rotation: 360, duration: 2.4, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
  }, []);

  /* ── step & progress sequencer ───────────────────────── */
  useEffect(() => {
    let currentStep = 0;
    let currentPct  = 0;
    const totalSteps = SCAN_STEPS.length;

    const runStep = () => {
      if (currentStep >= totalSteps) {
        setDone(true);
        // animate bar to 100
        const obj = { v: currentPct };
        gsap.to(obj, { v: 100, duration: 0.4, onUpdate: () => { setPct(Math.round(obj.v)); if (barFillRef.current) barFillRef.current.style.width = obj.v + '%'; } });
        // result entrance
        setTimeout(() => {
          gsap.fromTo(resultRef.current,
            { y: 20, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.5)' }
          );
        }, 450);
        // exit to dashboard
        setTimeout(() => {
          gsap.to(overlayRef.current, {
            opacity: 0, y: -20, duration: 0.55, ease: 'power2.in',
            onComplete: onComplete,
          });
        }, 2000);
        return;
      }
      setStepIdx(currentStep);
      const targetPct = Math.round(((currentStep + 1) / totalSteps) * 100);
      const obj = { v: currentPct };
      gsap.to(obj, {
        v: targetPct,
        duration: SCAN_STEPS[currentStep].duration / 1000,
        ease: 'power1.inOut',
        onUpdate: () => {
          setPct(Math.round(obj.v));
          if (barFillRef.current) barFillRef.current.style.width = obj.v + '%';
        },
        onComplete: () => {
          currentPct = targetPct;
          currentStep++;
          setTimeout(runStep, 80);
        },
      });
    };
    const t = setTimeout(runStep, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = SCAN_STEPS[Math.min(stepIdx, SCAN_STEPS.length - 1)];
  const StepIcon = step?.icon || Shield;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'radial-gradient(ellipse at 50% 35%, #0a0818 0%, #030308 65%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Syne', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* particles */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(91,90,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(91,90,255,0.035) 1px, transparent 1px)`,
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 72%)',
      }} />

      {/* ambient glows */}
      <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'#5b5aff', opacity:0.06, filter:'blur(120px)', top:'-15%', left:'-10%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'#00c9a7', opacity:0.05, filter:'blur(100px)', bottom:'-10%', right:'-5%', pointerEvents:'none' }} />

      {/* corner brackets */}
      {[['top:24px','left:24px','borderTop','borderLeft'],['top:24px','right:24px','borderTop','borderRight'],['bottom:24px','left:24px','borderBottom','borderLeft'],['bottom:24px','right:24px','borderBottom','borderRight']].map(([p1,p2,b1,b2],i) => (
        <div key={i} style={{ position:'absolute', width:48, height:48, [p1.split(':')[0]]:p1.split(':')[1], [p2.split(':')[0]]:p2.split(':')[1], [b1]:'1px solid rgba(91,90,255,0.25)', [b2]:'1px solid rgba(91,90,255,0.25)', pointerEvents:'none' }} />
      ))}

      {/* ── Radar / scanner ── */}
      <div ref={radarRef} style={{ position:'relative', width:260, height:260, marginBottom:44 }}>
        {/* pulse circles */}
        {[1,2,3].map(n => (
          <div key={n} style={{
            position:'absolute', inset: n*30, borderRadius:'50%',
            border:'1px solid rgba(91,90,255,0.12)',
          }} />
        ))}

        {/* ring 1 – dashed outer */}
        <div ref={ring1Ref} style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px dashed rgba(91,90,255,0.28)' }} />

        {/* ring 2 – accent arc */}
        <div ref={ring2Ref} style={{
          position:'absolute', inset:14, borderRadius:'50%',
          border:'2px solid transparent',
          borderTopColor: done ? '#00e5a0' : '#5b5aff',
          borderRightColor: done ? '#00e5a0' : '#5b5aff',
          boxShadow: done ? '0 0 24px rgba(0,229,160,0.45)' : '0 0 24px rgba(91,90,255,0.45)',
          transition: 'border-color 0.5s, box-shadow 0.5s',
        }} />

        {/* ring 3 – thin outer */}
        <div ref={ring3Ref} style={{ position:'absolute', inset:6, borderRadius:'50%', border:'1px solid rgba(91,90,255,0.15)' }} />

        {/* radar sweep */}
        {!done && (
          <div ref={sweepRef} style={{ position:'absolute', inset:14, borderRadius:'50%', overflow:'hidden' }}>
            <div style={{
              position:'absolute', top:'50%', left:'50%',
              width:'50%', height:'50%',
              transformOrigin:'0% 0%',
              background:'conic-gradient(from 0deg, transparent 0deg, rgba(91,90,255,0.35) 60deg, transparent 60deg)',
            }} />
          </div>
        )}

        {/* center icon */}
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div ref={dotRef} style={{
            width:72, height:72, borderRadius:'50%',
            background: done ? 'rgba(0,229,160,0.12)' : 'rgba(91,90,255,0.1)',
            border: done ? '1px solid rgba(0,229,160,0.3)' : '1px solid rgba(91,90,255,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background 0.5s, border-color 0.5s',
          }}>
            {done
              ? <CheckCircle size={30} strokeWidth={1.6} style={{ color:'#00e5a0' }} />
              : <StepIcon    size={26} strokeWidth={1.4} style={{ color:'#5b5aff' }} />
            }
          </div>
        </div>
      </div>

      {/* ── Glass panel ── */}
      <div style={{
        width:'100%', maxWidth:420,
        borderRadius:20,
        background:'rgba(10,9,22,0.80)',
        border:`1px solid ${done ? 'rgba(0,229,160,0.25)' : 'rgba(91,90,255,0.2)'}`,
        boxShadow: done ? '0 0 60px rgba(0,229,160,0.15), 0 24px 64px rgba(0,0,0,0.7)' : '0 0 40px rgba(91,90,255,0.1), 0 24px 64px rgba(0,0,0,0.7)',
        backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
        padding:'28px 32px', position:'relative', overflow:'hidden',
        transition:'border-color 0.6s, box-shadow 0.6s',
      }}>
        {/* top accent */}
        <div style={{
          position:'absolute', top:0, left:'20%', right:'20%', height:1,
          background: done ? 'linear-gradient(90deg,transparent,#00e5a0,transparent)' : 'linear-gradient(90deg,transparent,#5b5aff,transparent)',
          transition:'background 0.6s',
        }} />

        {/* label */}
        <p style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color: done ? '#00e5a0' : 'rgba(91,90,255,0.7)', marginBottom:8, fontWeight:600, transition:'color 0.5s' }}>
          {done ? 'SYSTEM SECURE' : 'SECURITY SCAN'}
        </p>

        {/* headline */}
        <h2 style={{ fontSize:22, fontWeight:700, color:'#e8e8ff', letterSpacing:'-0.02em', margin:'0 0 18px' }}>
          {done ? 'System Secure' : 'Scanning system…'}
        </h2>

        {/* current step */}
        {!done && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <StepIcon size={14} style={{ color:'rgba(91,90,255,0.7)', flexShrink:0 }} />
            <p style={{ fontSize:13, color:'rgba(200,200,230,0.6)', fontFamily:'monospace', letterSpacing:'0.02em' }}>
              {step?.text}
            </p>
          </div>
        )}

        {/* progress bar */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:11, color:'rgba(160,160,200,0.5)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
            <span>Analysis progress</span>
            <span style={{ color: done ? '#00e5a0' : '#5b5aff', fontWeight:600, transition:'color 0.5s' }}>{pct}%</span>
          </div>
          <div style={{ height:4, borderRadius:2, background:'rgba(91,90,255,0.08)', overflow:'hidden' }}>
            <div ref={barFillRef} style={{
              height:'100%', width:'0%', borderRadius:2,
              background: done ? 'linear-gradient(90deg,#00c9a7,#00e5a0)' : 'linear-gradient(90deg,#5b5aff,#7b6aff)',
              boxShadow: done ? '0 0 12px rgba(0,229,160,0.6)' : '0 0 12px rgba(91,90,255,0.6)',
              transition:'background 0.5s, box-shadow 0.5s',
            }} />
          </div>
        </div>

        {/* step indicators */}
        <div style={{ display:'flex', gap:6, marginTop:20 }}>
          {SCAN_STEPS.map((s, i) => (
            <div key={i} style={{
              flex:1, height:3, borderRadius:2,
              background: i < stepIdx ? (done ? '#00e5a0' : '#5b5aff') : 'rgba(91,90,255,0.1)',
              transition:'background 0.4s',
            }} />
          ))}
        </div>

        {/* result row */}
        {done && (
          <div ref={resultRef} style={{ marginTop:20, display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, background:'rgba(0,229,160,0.07)', border:'1px solid rgba(0,229,160,0.2)', opacity:0 }}>
            <CheckCircle size={20} style={{ color:'#00e5a0', flexShrink:0 }} />
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'#00e5a0', marginBottom:2 }}>No threats detected</p>
              <p style={{ fontSize:11, color:'rgba(200,200,230,0.45)', letterSpacing:'0.04em' }}>All systems nominal · {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* bottom brand */}
      <p style={{ position:'absolute', bottom:20, fontSize:10, color:'rgba(120,120,160,0.35)', letterSpacing:'0.15em', textTransform:'uppercase', fontFamily:'monospace' }}>
        SecureVault · Zero-Knowledge · AES-256
      </p>
    </div>
  );
};

export default PostLoginScan;
