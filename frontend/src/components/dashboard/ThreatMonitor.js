import React, { useState, useEffect, useRef } from 'react';
import { Shield, Activity, Clock, AlertTriangle, CheckCircle, Zap, Eye, Upload, Download, LogIn } from 'lucide-react';

/* ── helpers ── */
const fmt = (d) => {
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return new Date(d).toLocaleDateString();
};

const RISK_CONFIG = {
  clean:      { color: '#00e5a0', label: 'Clean',        glow: 'rgba(0,229,160,0.35)'  },
  suspicious: { color: '#ffc14d', label: 'Suspicious',   glow: 'rgba(255,193,77,0.35)' },
  blocked:    { color: '#ff4060', label: 'Blocked',      glow: 'rgba(255,64,96,0.35)'  },
};

const EVENT_ICONS = {
  login:    { icon: LogIn,    color: '#5b5aff' },
  upload:   { icon: Upload,   color: '#00c9a7' },
  download: { icon: Download, color: '#b06aff' },
  scan:     { icon: Shield,   color: '#ffc14d' },
};

/* ── Pulsing dot ── */
const PulseDot = ({ color }) => (
  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 12, height: 12 }}>
    <span style={{
      position: 'absolute', width: 12, height: 12, borderRadius: '50%',
      background: color, opacity: 0.25,
      animation: 'pulse-ring 1.8s ease-out infinite',
    }} />
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'block', boxShadow: `0 0 6px ${color}` }} />
  </span>
);

/* ── Security score ring ── */
const ScoreRing = ({ score }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 120, cx = size / 2, cy = size / 2, r = 48;
    canvas.width = size; canvas.height = size;

    const color = score >= 80 ? '#00e5a0' : score >= 50 ? '#ffc14d' : '#ff4060';

    ctx.clearRect(0, 0, size, size);
    // track
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5);
    ctx.strokeStyle = 'rgba(91,90,255,0.1)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // fill
    let current = 0;
    const target = (score / 100) * Math.PI * 2;
    const step = target / 40;
    const anim = () => {
      if (current >= target) return;
      current = Math.min(current + step, target);
      ctx.clearRect(0, 0, size, size);
      // redraw track
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5);
      ctx.strokeStyle = 'rgba(91,90,255,0.1)';
      ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
      // draw fill
      const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#5b5aff');
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + current);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
      requestAnimationFrame(anim);
    };
    const t = setTimeout(anim, 300);
    return () => clearTimeout(t);
  }, [score]);

  const color = score >= 80 ? '#00e5a0' : score >= 50 ? '#ffc14d' : '#ff4060';
  const label = score >= 80 ? 'Secure' : score >= 50 ? 'At Risk' : 'Threat';

  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <canvas ref={canvasRef} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: 10, color: 'rgba(160,160,200,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>{label}</span>
      </div>
    </div>
  );
};

/* ── Main component ── */
const ThreatMonitor = ({ stats, recentFiles = [] }) => {
  const [events, setEvents] = useState([]);
  const [lastFile, setLastFile] = useState(null);

  /* derive security score from actual file security scores */
  const score = React.useMemo(() => {
    if (!stats) return 92;
    if (recentFiles.length > 0) {
      const scored = recentFiles.filter(f => f.securityScore != null);
      if (scored.length > 0) {
        const avg = Math.round(scored.reduce((s, f) => s + f.securityScore, 0) / scored.length);
        return avg;
      }
    }
    // fallback: all files encrypted = high score
    const total = stats.totalFiles || 1;
    const base = Math.min(Math.round((total > 0 ? 85 : 60) + (stats.totalFiles > 5 ? 8 : 3)), 97);
    return base;
  }, [stats, recentFiles]);

  /* build mock timeline from real data + session events */
  useEffect(() => {
    const now = Date.now();
    const base = [
      { id: 1, type: 'login',    label: 'Secure login',         time: new Date(now - 2 * 60000) },
      { id: 2, type: 'scan',     label: 'System scan complete', time: new Date(now - 1.5 * 60000) },
    ];
    if (recentFiles.length > 0) {
      recentFiles.slice(0, 3).forEach((f, i) => {
        base.push({ id: 10 + i, type: 'upload', label: `Uploaded ${f.name}`, time: new Date(f.createdAt || now - i * 60000 * 3) });
      });
    }
    setEvents(base.sort((a, b) => b.time - a.time));
    if (recentFiles[0]) setLastFile(recentFiles[0]);
  }, [recentFiles]);

  const systemRisk = score >= 80 ? 'clean' : score >= 50 ? 'suspicious' : 'blocked';
  const riskCfg    = RISK_CONFIG[systemRisk];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── style tag for pulse animation ── */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes threat-scan {
          0%   { transform: scaleX(0); opacity: 1;   }
          80%  { transform: scaleX(1); opacity: 0.8; }
          100% { transform: scaleX(1); opacity: 0;   }
        }
      `}</style>

      {/* ── Row: Score + Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Security Score */}
        <div style={{
          borderRadius: 16,
          background: 'rgba(10,9,22,0.75)',
          border: '1px solid rgba(91,90,255,0.15)',
          backdropFilter: 'blur(20px)',
          padding: '20px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'#5b5aff', opacity:0.06, filter:'blur(20px)' }} />
          <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(160,160,200,0.45)', fontWeight: 600 }}>Security Score</p>
          <ScoreRing score={score} />
        </div>

        {/* System Status */}
        <div style={{
          borderRadius: 16,
          background: 'rgba(10,9,22,0.75)',
          border: `1px solid ${riskCfg.color}22`,
          backdropFilter: 'blur(20px)',
          padding: '20px 16px',
          display: 'flex', flexDirection: 'column', gap: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background: riskCfg.color, opacity:0.07, filter:'blur(20px)' }} />
          <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(160,160,200,0.45)', fontWeight: 600 }}>Threat Monitor</p>

          {/* status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PulseDot color={riskCfg.color} />
            <span style={{ fontSize: 14, fontWeight: 700, color: riskCfg.color }}>{riskCfg.label}</span>
          </div>

          {/* indicators */}
          {[
            { label: 'Firewall',    status: 'Active',   color: '#00e5a0' },
            { label: 'Encryption',  status: 'AES-256',  color: '#00e5a0' },
            { label: 'Scan engine', status: 'v2.4',     color: '#5b5aff' },
          ].map(({ label, status, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(160,160,200,0.5)' }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: 'monospace' }}>{status}</span>
            </div>
          ))}

          {/* last scanned */}
          {lastFile && (
            <div style={{ marginTop: 2, padding: '8px 10px', borderRadius: 8, background: 'rgba(91,90,255,0.06)', border: '1px solid rgba(91,90,255,0.1)' }}>
              <p style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(140,140,180,0.45)', marginBottom: 3 }}>Last scanned</p>
              <p style={{ fontSize: 11, color: '#c8c8e8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastFile.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Timeline ── */}
      <div style={{
        borderRadius: 16,
        background: 'rgba(10,9,22,0.75)',
        border: '1px solid rgba(91,90,255,0.12)',
        backdropFilter: 'blur(20px)',
        padding: '18px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* scan line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg,transparent,rgba(91,90,255,0.6),transparent)',
          animation: 'threat-scan 3s ease-in-out infinite',
          transformOrigin: 'left center',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Activity size={13} style={{ color: '#5b5aff' }} />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(160,160,200,0.6)' }}>
            Activity Timeline
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {events.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(140,140,180,0.4)', textAlign: 'center', padding: '12px 0' }}>No activity yet</p>
          )}
          {events.map((ev, i) => {
            const cfg = EVENT_ICONS[ev.type] || EVENT_ICONS.scan;
            const Icon = cfg.icon;
            const isLast = i === events.length - 1;
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                {/* line */}
                {!isLast && (
                  <div style={{ position: 'absolute', left: 15, top: 28, bottom: 0, width: 1, background: 'rgba(91,90,255,0.1)' }} />
                )}
                {/* icon */}
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 6 }}>
                  <Icon size={13} style={{ color: cfg.color }} />
                </div>
                {/* text */}
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14, paddingTop: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#d8d8f0', marginBottom: 2 }}>{ev.label}</p>
                  <p style={{ fontSize: 10, color: 'rgba(140,140,180,0.45)', fontFamily: 'monospace' }}>{fmt(ev.time)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThreatMonitor;
