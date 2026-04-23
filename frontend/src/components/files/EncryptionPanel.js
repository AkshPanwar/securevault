import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Database, CheckCircle, AlertTriangle, RefreshCw, Lock, Cpu } from 'lucide-react';
import api from '../../utils/api';
import { formatBytes } from '../../utils/fileUtils';
import toast from 'react-hot-toast';

/* Animated number counter */
const AnimatedNumber = ({ value, suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) return;
    const step = Math.ceil(end / 30);
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}{suffix}</span>;
};

/* Circular progress for security score */
const ScoreRing = ({ score }) => {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || score == null) return;
    const ctx   = canvas.getContext('2d');
    const S     = 80, cx = 40, cy = 40, r = 30;
    canvas.width = S; canvas.height = S;

    const color = score >= 80 ? '#00e5a0' : score >= 50 ? '#ffc14d' : '#ff4060';
    const target = (score / 100) * Math.PI * 2;
    let current = 0;

    const draw = () => {
      ctx.clearRect(0, 0, S, S);
      // track
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5);
      ctx.strokeStyle = 'rgba(91,90,255,0.12)';
      ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
      // glow
      ctx.shadowBlur = 10; ctx.shadowColor = color;
      // fill
      const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      g.addColorStop(0, color); g.addColorStop(1, '#5b5aff');
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + current);
      ctx.strokeStyle = g;
      ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const animate = () => {
      if (current < target) {
        current = Math.min(current + target / 35, target);
        draw();
        animRef.current = requestAnimationFrame(animate);
      } else {
        draw();
      }
    };
    const t = setTimeout(animate, 150);
    return () => { clearTimeout(t); if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [score]);

  const color = score >= 80 ? '#00e5a0' : score >= 50 ? '#ffc14d' : '#ff4060';
  const label = score >= 80 ? 'Low Risk' : score >= 50 ? 'Med Risk' : 'High Risk';

  return (
    <div style={{ position: 'relative', width: 80, height: 80 }}>
      <canvas ref={canvasRef} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>
          {score != null ? <AnimatedNumber value={score} /> : '—'}
        </span>
        <span style={{ fontSize: 8, color: 'rgba(160,160,200,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
};

const EncryptionPanel = ({ file, onFileUpdate }) => {
  const [verifying,  setVerifying]  = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [pulse, setPulse] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    setPulse(true);
    try {
      const { data } = await api.get(`/files/${file._id}/verify`);
      setVerifyResult(data.data);
      if (data.data.intact) {
        toast.success('Integrity verified ✅');
      } else {
        toast.error('Checksum mismatch detected!');
      }
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
      setTimeout(() => setPulse(false), 1000);
    }
  };

  if (!file) return null;

  const score    = file.securityScore;
  const risk     = file.riskLevel || 'low';
  const ivShort  = file.iv ? `${file.iv.slice(0, 8)}…${file.iv.slice(-4)}` : null;
  const hashShort = file.checksum ? `${file.checksum.slice(0, 10)}…${file.checksum.slice(-6)}` : null;

  const riskColor = risk === 'low' ? '#00e5a0' : risk === 'medium' ? '#ffc14d' : '#ff4060';
  const riskLabel = risk === 'low' ? 'Low Risk' : risk === 'medium' ? 'Medium Risk' : 'High Risk';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        @keyframes enc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes enc-scan  { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Header: AES-256 badge + score ring ── */}
      <div style={{
        borderRadius: 16, padding: '18px 20px',
        background: 'rgba(0,229,160,0.04)',
        border: '1px solid rgba(0,229,160,0.18)',
        backdropFilter: 'blur(20px)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* scan line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(0,229,160,0.5),transparent)',
          animation: 'enc-scan 2.5s linear infinite',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={13} style={{ color: '#00e5a0' }} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#00e5a0', fontFamily: "'Syne',sans-serif" }}>🔐 AES-256 Encryption</p>
              <p style={{ fontSize: 10, color: 'rgba(160,200,160,0.5)', marginTop: 1 }}>CBC Mode · PKCS#7 Padding</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e5a0', boxShadow: '0 0 6px #00e5a0', animation: 'enc-pulse 2s ease infinite' }} />
            <span style={{ fontSize: 10, color: 'rgba(0,229,160,0.7)', fontFamily: 'monospace' }}>ACTIVE — File is encrypted at rest</span>
          </div>
        </div>

        {score != null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <ScoreRing score={score} />
            <span style={{ fontSize: 9, color: 'rgba(160,160,200,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Security Score</span>
          </div>
        )}
      </div>

      {/* ── Encryption Metadata ── */}
      <div style={{
        borderRadius: 16, padding: '16px 20px',
        background: 'rgba(10,9,22,0.75)',
        border: '1px solid rgba(91,90,255,0.15)',
        backdropFilter: 'blur(20px)',
      }}>
        <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,160,200,0.4)', fontWeight: 600, marginBottom: 14 }}>Encryption Metadata</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: Shield,   label: '🔐 Algorithm',       value: file.encryptionType || 'AES-256-CBC',   color: '#00e5a0' },
            { icon: Cpu,      label: '🧬 IV (Init Vector)', value: ivShort || 'Stored securely',          color: '#5b5aff' },
            { icon: Key,      label: '🔑 File Hash (SHA-256)', value: hashShort || 'N/A',                 color: '#b06aff' },
            { icon: Database, label: '📦 Encrypted Size',  value: file.encryptedSize ? formatBytes(file.encryptedSize) : formatBytes(file.size), color: '#ffc14d' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={11} style={{ color }} />
                </div>
                <span style={{ fontSize: 11, color: 'rgba(160,160,200,0.55)' }}>{label}</span>
              </div>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color, background: `${color}0d`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${color}20`, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk Level Badge ── */}
      {score != null && (
        <div style={{
          borderRadius: 16, padding: '14px 20px',
          background: `${riskColor}08`,
          border: `1px solid ${riskColor}25`,
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${riskColor}15`, border: `1px solid ${riskColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {risk === 'low' ? <CheckCircle size={15} style={{ color: riskColor }} /> : <AlertTriangle size={15} style={{ color: riskColor }} />}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: riskColor, fontFamily: "'Syne',sans-serif" }}>{riskLabel}</p>
              <p style={{ fontSize: 10, color: 'rgba(160,160,200,0.45)', marginTop: 1 }}>{score}% Secure</p>
            </div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: riskColor,
            background: `${riskColor}12`, border: `1px solid ${riskColor}25`,
            padding: '4px 12px', borderRadius: 20,
            fontFamily: 'monospace',
          }}>
            {score >= 80 ? 'SAFE' : score >= 50 ? 'CAUTION' : 'DANGER'}
          </div>
        </div>
      )}

      {/* ── Verify Encryption Button ── */}
      <button
        onClick={handleVerify}
        disabled={verifying}
        style={{
          width: '100%',
          padding: '13px 20px',
          borderRadius: 14,
          background: verifying ? 'rgba(91,90,255,0.08)' : 'rgba(91,90,255,0.1)',
          border: `1px solid ${pulse ? 'rgba(91,90,255,0.6)' : 'rgba(91,90,255,0.25)'}`,
          color: '#c0c0ff',
          cursor: verifying ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 13, fontWeight: 600,
          transition: 'all 0.2s ease',
          boxShadow: pulse ? '0 0 20px rgba(91,90,255,0.3)' : 'none',
          position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={e => { if (!verifying) e.currentTarget.style.background = 'rgba(91,90,255,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(91,90,255,0.1)'; }}
      >
        {verifying && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(91,90,255,0.1),transparent)', animation: 'enc-scan 1s linear infinite' }} />
        )}
        {verifying
          ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verifying integrity…</>
          : <><Shield size={14} /> Verify Encryption</>
        }
      </button>

      {/* ── Verify Result ── */}
      {verifyResult && (
        <div style={{
          borderRadius: 14, padding: '14px 18px',
          background: verifyResult.intact ? 'rgba(0,229,160,0.06)' : 'rgba(255,64,96,0.06)',
          border: `1px solid ${verifyResult.intact ? 'rgba(0,229,160,0.3)' : 'rgba(255,64,96,0.3)'}`,
          animation: 'fadeSlide 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {verifyResult.intact
              ? <CheckCircle size={16} style={{ color: '#00e5a0' }} />
              : <AlertTriangle size={16} style={{ color: '#ff4060' }} />}
            <span style={{ fontSize: 13, fontWeight: 700, color: verifyResult.intact ? '#00e5a0' : '#ff4060', fontFamily: "'Syne',sans-serif" }}>
              {verifyResult.intact ? 'Integrity Verified ✅' : 'Integrity Check Failed ⚠️'}
            </span>
          </div>
          {[
            { label: 'Algorithm', value: verifyResult.encryptionType || 'AES-256-CBC' },
            { label: 'Stored Hash', value: verifyResult.storedChecksum ? `${verifyResult.storedChecksum.slice(0,12)}…` : '—' },
            { label: 'Current Hash', value: verifyResult.currentChecksum ? `${verifyResult.currentChecksum.slice(0,12)}…` : '—' },
            { label: 'Status', value: verifyResult.message },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'rgba(160,160,200,0.5)' }}>{label}</span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(200,200,240,0.8)' }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EncryptionPanel;
