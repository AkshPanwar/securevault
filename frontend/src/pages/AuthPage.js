import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, Mail, User, ArrowRight, RotateCcw, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import PostLoginScan from '../components/shared/PostLoginScan';

const MODES = { LOGIN: 'login', SIGNUP: 'signup', OTP: 'otp', OTP_2FA: 'otp_2fa' };

const AuthPage = () => {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [mode,           setMode]           = useState(MODES.LOGIN);
  const [showPassword,   setShowPassword]   = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [pendingUserId,  setPendingUserId]  = useState(null);
  const [otp,            setOtp]            = useState(['', '', '', '', '', '']);
  const [showScan,       setShowScan]       = useState(false);
  const [pendingAuth,    setPendingAuth]    = useState(null); // {token,refresh,user}
  const otpRefs = useRef([]);
  const [form, setForm]     = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const canvasRef = useRef(null);

  /* ── particle canvas ─────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 50; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.2 + 0.3, dx: (Math.random() - 0.5) * 0.25, dy: (Math.random() - 0.5) * 0.25, opacity: Math.random() * 0.4 + 0.05 });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(91,90,255,${p.opacity})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath(); ctx.strokeStyle = `rgba(91,90,255,${0.06 * (1 - dist / 100)})`; ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  /* ── OTP handlers ────────────────────────────────────── */
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value.slice(-1); setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
      setOtp(newOtp); otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  /* ── validation ──────────────────────────────────────── */
  const validate = () => {
    const errs = {};
    if (mode === MODES.SIGNUP && !form.name.trim()) errs.name = 'Name required';
    if (!form.email.match(/^\S+@\S+\.\S+$/)) errs.email = 'Valid email required';
    if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters';
    setErrors(errs); return Object.keys(errs).length === 0;
  };

  /* ── trigger scan then navigate ─────────────────────── */
  const triggerLoginFlow = (accessToken, refreshToken, user) => {
    login(accessToken, refreshToken, user);
    setPendingAuth({ accessToken, refreshToken, user });
    setShowScan(true);
  };

  const handleScanComplete = () => {
    setShowScan(false);
    navigate('/dashboard');
    toast.success('Welcome back!');
  };

  /* ── submit ──────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === MODES.LOGIN) {
        const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
        if (data.data.requires2FA) {
          setPendingUserId(data.data.userId); setMode(MODES.OTP_2FA);
        } else {
          triggerLoginFlow(data.data.accessToken, data.data.refreshToken, data.data.user);
        }
      } else {
        const { data } = await api.post('/auth/signup', form);
        setPendingUserId(data.data.userId); setMode(MODES.OTP);
        toast.success('Check your email for the code!');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Enter 6-digit code');
    setLoading(true);
    try {
      const endpoint = mode === MODES.OTP_2FA ? '/auth/verify-2fa' : '/auth/verify-email';
      const { data } = await api.post(endpoint, { userId: pendingUserId, otp: code });
      triggerLoginFlow(data.data.accessToken, data.data.refreshToken, data.data.user);
      toast.success('Verified successfully!');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid code'); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    try { await api.post('/auth/resend-otp', { userId: pendingUserId }); toast.success('New code sent!'); }
    catch { toast.error('Failed to resend'); }
  };

  const isOtpMode = mode === MODES.OTP || mode === MODES.OTP_2FA;

  return (
    <>
      {showScan && <PostLoginScan onComplete={handleScanComplete} />}

      <div className="min-h-screen flex" style={{ background: '#030308' }}>
        {/* ── Left decorative panel ── */}
        <div className="hidden lg:flex flex-1 flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #07070f 0%, #0c0c18 100%)' }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div style={{ position:'absolute', borderRadius:'50%', filter:'blur(100px)', width:480, height:480, background:'#5b5aff', opacity:0.08, top:'-10%', left:'-10%' }} />
          <div style={{ position:'absolute', borderRadius:'50%', filter:'blur(100px)', width:360, height:360, background:'#00c9a7', opacity:0.06, bottom:'10%', right:'-5%' }} />

          <div className="relative z-10 flex flex-col h-full p-14">
            <div className="flex items-center gap-3 mb-auto">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#5b5aff,#7b6aff)', boxShadow:'0 0 24px rgba(91,90,255,0.4)' }}>
                <Shield size={18} color="white" />
              </div>
              <span className="font-bold text-lg" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif', letterSpacing:'-0.02em' }}>SecureVault</span>
            </div>

            <div className="mb-14 space-y-6">
              <h1 className="text-4xl font-bold leading-tight" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif', letterSpacing:'-0.03em' }}>
                Your files,<br />encrypted &<br />always secure.
              </h1>
              <p className="text-base leading-relaxed" style={{ color:'#8888aa' }}>
                Military-grade AES-256 encryption, zero-knowledge architecture, and seamless sharing.
              </p>
              <div className="space-y-4 pt-2">
                {[
                  { icon:'🔐', text:'AES-256 encryption at rest' },
                  { icon:'👁️', text:'Zero-knowledge architecture' },
                  { icon:'⚡', text:'Instant secure file sharing' },
                  { icon:'🛡️', text:'Two-factor authentication' },
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg">{feat.icon}</span>
                    <span className="text-sm" style={{ color:'#8888aa' }}>{feat.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background:'rgba(91,90,255,0.06)', border:'1px solid rgba(91,90,255,0.15)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'rgba(91,90,255,0.15)' }}>
                <Lock size={14} color="#5b5aff" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color:'#f0f0ff' }}>Bank-grade security</p>
                <p className="text-xs" style={{ color:'#8888aa' }}>Your data is always private</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 lg:max-w-lg flex flex-col items-center justify-center p-6 relative">
          <div style={{ position:'absolute', borderRadius:'50%', filter:'blur(80px)', width:300, height:300, background:'#5b5aff', opacity:0.06, top:'10%', right:'10%' }} />

          <div className="w-full relative z-10" style={{ maxWidth: 360 }}>
            {/* mobile logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#5b5aff,#7b6aff)' }}>
                <Shield size={16} color="white" />
              </div>
              <span className="font-bold" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif' }}>SecureVault</span>
            </div>

            {/* ══ OTP MODE ══ */}
            {isOtpMode ? (
              <div className="animate-slide-up">
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background:'rgba(91,90,255,0.1)', border:'1px solid rgba(91,90,255,0.2)' }}>
                    <Shield size={22} color="#5b5aff" />
                  </div>
                  <h2 className="text-xl font-bold mb-1.5" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif', letterSpacing:'-0.02em' }}>
                    {mode === MODES.OTP_2FA ? 'Two-factor auth' : 'Verify email'}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color:'#8888aa' }}>
                    {mode === MODES.OTP_2FA
                      ? 'Enter the 6-digit code from your authenticator app.'
                      : 'We sent a 6-digit code to your email address.'}
                  </p>
                </div>

                {/* ── OTP inputs (fixed: responsive, no overflow) ── */}
                <div
                  style={{ display:'flex', gap:8, marginBottom:24 }}
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        maxWidth: 52,
                        height: 52,
                        textAlign: 'center',
                        fontSize: 20,
                        fontWeight: 700,
                        borderRadius: 12,
                        background: 'rgba(7,7,15,0.7)',
                        border: `1.5px solid ${digit ? 'rgba(91,90,255,0.55)' : 'rgba(31,31,56,0.9)'}`,
                        color: '#f0f0ff',
                        outline: 'none',
                        boxShadow: digit ? '0 0 0 3px rgba(91,90,255,0.12), 0 0 12px rgba(91,90,255,0.2)' : 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        fontFamily: "'JetBrains Mono', monospace",
                        caretColor: '#5b5aff',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(91,90,255,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,90,255,0.18), 0 0 16px rgba(91,90,255,0.25)'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor = digit ? 'rgba(91,90,255,0.55)' : 'rgba(31,31,56,0.9)'; e.currentTarget.style.boxShadow = digit ? '0 0 0 3px rgba(91,90,255,0.12)' : 'none'; }}
                    />
                  ))}
                </div>

                <button onClick={handleVerifyOtp} disabled={loading || otp.join('').length !== 6}
                  className="btn-primary w-full justify-center py-3 text-base mb-3">
                  {loading ? 'Verifying…' : 'Verify Code'}
                  {!loading && <ArrowRight size={16} />}
                </button>

                {mode === MODES.OTP && (
                  <button onClick={handleResendOtp} className="btn-ghost w-full justify-center">
                    <RotateCcw size={14} /> Resend code
                  </button>
                )}
                <button onClick={() => { setMode(MODES.LOGIN); setOtp(['','','','','','']); }}
                  className="btn-ghost w-full justify-center mt-1 text-xs">
                  Back to sign in
                </button>
              </div>
            ) : (
              /* ══ LOGIN / SIGNUP MODE ══ */
              <div className="animate-slide-up">
                <div className="mb-7">
                  <h2 className="text-2xl font-bold mb-1.5" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif', letterSpacing:'-0.02em' }}>
                    {mode === MODES.LOGIN ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-sm" style={{ color:'#8888aa' }}>
                    {mode === MODES.LOGIN ? 'Sign in to access your secure vault.' : 'Start securing your files today.'}
                  </p>
                </div>

                {/* toggle */}
                <div className="flex rounded-xl p-1 mb-7" style={{ background:'rgba(7,7,15,0.7)', border:'1px solid rgba(22,22,42,0.9)' }}>
                  {[MODES.LOGIN, MODES.SIGNUP].map(m => (
                    <button key={m} onClick={() => { setMode(m); setErrors({}); }}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                      style={{ background: mode === m ? 'rgba(91,90,255,0.15)' : 'transparent', color: mode === m ? '#f0f0ff' : '#8888aa', border: mode === m ? '1px solid rgba(91,90,255,0.3)' : '1px solid transparent' }}>
                      {m === MODES.LOGIN ? 'Sign In' : 'Sign Up'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === MODES.SIGNUP && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color:'#8888aa' }}>Full Name</label>
                      <div className="relative">
                        <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:'#444460' }} />
                        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="John Doe" className="input-field pl-11"
                          style={errors.name ? { borderColor:'rgba(255,56,96,0.5)' } : {}} />
                      </div>
                      {errors.name && <p className="text-xs mt-1" style={{ color:'#ff3860' }}>{errors.name}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color:'#8888aa' }}>Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:'#444460' }} />
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="you@example.com" className="input-field pl-11"
                        style={errors.email ? { borderColor:'rgba(255,56,96,0.5)' } : {}} />
                    </div>
                    {errors.email && <p className="text-xs mt-1" style={{ color:'#ff3860' }}>{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color:'#8888aa' }}>Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:'#444460' }} />
                      <input type={showPassword ? 'text' : 'password'} value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        placeholder={mode === MODES.SIGNUP ? 'Enter a strong password (min 8 characters)' : '••••••••'} className="input-field pl-11 pr-11"
                        style={errors.password ? { borderColor:'rgba(255,56,96,0.5)' } : {}} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color:'#444460', cursor:'pointer', background:'none', border:'none', padding:0 }}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs mt-1" style={{ color:'#ff3860' }}>{errors.password}</p>}
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
                    {loading ? (mode === MODES.LOGIN ? 'Signing in…' : 'Creating account…') : (mode === MODES.LOGIN ? 'Sign In' : 'Create Account')}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>

                <p className="text-xs text-center mt-5" style={{ color:'#444460' }}>
                  {mode === MODES.LOGIN ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={() => { setMode(mode === MODES.LOGIN ? MODES.SIGNUP : MODES.LOGIN); setErrors({}); }}
                    className="font-medium transition-colors" style={{ color:'#5b5aff', background:'none', border:'none', cursor:'pointer' }}>
                    {mode === MODES.LOGIN ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
