import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RotateCcw, Lock, Shield, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PHASES = [
  { text: 'Decrypting file…',         icon: Lock,   color: '#5b5aff' },
  { text: 'Editing secure content…',  icon: Shield, color: '#00c9a7' },
];

const SAVE_PHASES = [
  'Re-encrypting content…',
  'Updating file hash…',
  'Saving securely…',
];

const FileEditor = ({ file, onClose, onSaved }) => {
  const [phase,       setPhase]       = useState('loading'); // loading | editing | saving | done
  const [content,     setContent]     = useState('');
  const [original,    setOriginal]    = useState('');
  const [savePhaseIdx,setSavePhaseIdx]= useState(0);
  const [saveResult,  setSaveResult]  = useState(null);
  const textareaRef = useRef(null);
  const overlayRef  = useRef(null);
  const saveTimer   = useRef(null);

  /* ── Load decrypted content ── */
  useEffect(() => {
    const load = async () => {
      setPhase('loading');
      try {
        const { data } = await api.get(`/files/${file._id}/content`);
        // small delay for dramatic effect
        await new Promise(r => setTimeout(r, 900));
        setContent(data.data.content);
        setOriginal(data.data.content);
        setPhase('editing');
        setTimeout(() => textareaRef.current?.focus(), 100);
      } catch (err) {
        toast.error('Could not decrypt file');
        onClose();
      }
    };
    load();
    return () => { if (saveTimer.current) clearInterval(saveTimer.current); };
  }, [file._id]);

  /* ── Animate overlay in ── */
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '1';
    });
  }, []);

  const handleSave = async () => {
    if (content === original) { toast('No changes to save'); return; }
    setPhase('saving');
    setSavePhaseIdx(0);

    // animate through save phases
    let idx = 0;
    saveTimer.current = setInterval(() => {
      idx++;
      if (idx < SAVE_PHASES.length) setSavePhaseIdx(idx);
      else {
        clearInterval(saveTimer.current);
      }
    }, 700);

    try {
      await new Promise(r => setTimeout(r, 200)); // slight lead for UX
      const { data } = await api.put(`/files/${file._id}/content`, { content });
      clearInterval(saveTimer.current);
      await new Promise(r => setTimeout(r, 600));
      setSaveResult(data.data.file);
      setPhase('done');
      toast.success('File saved & re-encrypted');
      onSaved?.(data.data.file);
    } catch (err) {
      clearInterval(saveTimer.current);
      toast.error(err.response?.data?.message || 'Save failed');
      setPhase('editing');
    }
  };

  const handleClose = () => {
    const el = overlayRef.current;
    if (el) {
      el.style.opacity = '0';
      setTimeout(onClose, 280);
    } else {
      onClose();
    }
  };

  const isDirty = content !== original;

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(3,3,8,0.96)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(4000%)} }
        .editor-textarea { resize: none; outline: none; background: transparent; border: none; color: #d4d4f0; font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; font-size: 14px; line-height: 1.7; width: 100%; height: 100%; }
        .editor-textarea::selection { background: rgba(91,90,255,0.3); }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 200, background: 'radial-gradient(ellipse,rgba(91,90,255,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', flexShrink: 0,
        borderBottom: '1px solid rgba(91,90,255,0.15)',
        background: 'rgba(7,7,15,0.8)',
        position: 'relative',
      }}>
        {/* scan line */}
        {(phase === 'loading' || phase === 'saving') && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#5b5aff,transparent)', animation: 'scanLine 1.2s linear infinite' }} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(91,90,255,0.12)', border: '1px solid rgba(91,90,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={15} style={{ color: '#5b5aff' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f0ff', fontFamily: "'Syne',sans-serif" }}>{file.name}</p>
            <p style={{ fontSize: 10, color: 'rgba(160,160,200,0.45)', marginTop: 1 }}>
              {phase === 'loading' && '🔓 Decrypting file…'}
              {phase === 'editing' && `🔐 Secure Editor · AES-256 · ${isDirty ? 'Unsaved changes' : 'No changes'}`}
              {phase === 'saving' && `⚡ ${SAVE_PHASES[savePhaseIdx]}`}
              {phase === 'done'   && '✅ Saved & Re-encrypted'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {phase === 'editing' && (
            <>
              {isDirty && (
                <button
                  onClick={() => { setContent(original); }}
                  style={{ padding: '7px 16px', borderRadius: 10, background: 'rgba(22,22,42,0.7)', border: '1px solid rgba(31,31,56,0.9)', color: '#8888aa', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f0f0ff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#8888aa'}
                >
                  <RotateCcw size={12} /> Revert
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!isDirty}
                style={{
                  padding: '7px 20px', borderRadius: 10,
                  background: isDirty ? 'linear-gradient(135deg,#5b5aff,#7b6aff)' : 'rgba(91,90,255,0.1)',
                  border: '1px solid rgba(91,90,255,0.3)',
                  color: isDirty ? '#fff' : '#8888aa',
                  cursor: isDirty ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: isDirty ? '0 0 20px rgba(91,90,255,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Save size={12} /> Save
              </button>
            </>
          )}

          {(phase === 'loading' || phase === 'saving') && (
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(91,90,255,0.2)', borderTopColor: '#5b5aff', animation: 'spin 0.8s linear infinite' }} />
          )}

          {phase === 'done' && (
            <CheckCircle size={18} style={{ color: '#00e5a0' }} />
          )}

          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(22,22,42,0.7)', border: '1px solid rgba(31,31,56,0.9)', color: '#8888aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,56,96,0.1)'; e.currentTarget.style.color = '#ff3860'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(22,22,42,0.7)'; e.currentTarget.style.color = '#8888aa'; }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Editor body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Loading state */}
        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid rgba(91,90,255,0.15)', borderTopColor: '#5b5aff', animation: 'spin 1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '2px solid rgba(0,201,167,0.1)', borderBottomColor: '#00c9a7', animation: 'spin 1.5s linear infinite reverse' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#f0f0ff', fontFamily: "'Syne',sans-serif" }}>Decrypting file…</p>
              <p style={{ fontSize: 11, color: 'rgba(160,160,200,0.45)', marginTop: 4 }}>AES-256-CBC decryption in progress</p>
            </div>
          </div>
        )}

        {/* Saving state */}
        {phase === 'saving' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid rgba(91,90,255,0.15)', borderTopColor: '#5b5aff', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '2px solid rgba(0,201,167,0.1)', borderBottomColor: '#00c9a7', animation: 'spin 1.2s linear infinite reverse' }} />
              <Lock size={16} style={{ position: 'absolute', inset: 0, margin: 'auto', color: '#5b5aff' }} />
            </div>
            <div style={{ textAlign: 'center', animation: 'fadeSlide 0.3s ease' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#f0f0ff', fontFamily: "'Syne',sans-serif" }}>{SAVE_PHASES[savePhaseIdx]}</p>
              <p style={{ fontSize: 11, color: 'rgba(160,160,200,0.45)', marginTop: 4 }}>AES-256-CBC · SHA-256 hash update</p>
            </div>
          </div>
        )}

        {/* Done state */}
        {phase === 'done' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, animation: 'fadeSlide 0.4s ease' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(0,229,160,0.2)' }}>
              <CheckCircle size={32} style={{ color: '#00e5a0' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#00e5a0', fontFamily: "'Syne',sans-serif" }}>Saved & Re-encrypted</p>
              <p style={{ fontSize: 11, color: 'rgba(160,160,200,0.5)', marginTop: 6 }}>File hash updated · AES-256-CBC applied</p>
              {saveResult?.contentVersions?.length && (
                <p style={{ fontSize: 10, color: 'rgba(160,160,200,0.35)', marginTop: 3, fontFamily: 'monospace' }}>
                  <Clock size={9} style={{ display: 'inline', marginRight: 4 }} />
                  Version {saveResult.contentVersions.length} saved
                </p>
              )}
              <button onClick={handleClose} style={{
                marginTop: 20, padding: '10px 28px', borderRadius: 12,
                background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)',
                color: '#00e5a0', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                Close Editor
              </button>
            </div>
          </div>
        )}

        {/* Editing state */}
        {phase === 'editing' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Line numbers */}
            <div style={{
              width: 56, flexShrink: 0, paddingTop: 20,
              background: 'rgba(7,7,15,0.5)',
              borderRight: '1px solid rgba(31,31,56,0.6)',
              userSelect: 'none',
              overflowY: 'hidden',
            }}>
              {content.split('\n').map((_, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: '1.7', color: 'rgba(100,100,140,0.4)', textAlign: 'right', paddingRight: 12, paddingLeft: 8, fontFamily: 'monospace' }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
              <textarea
                ref={textareaRef}
                className="editor-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                spellCheck={false}
                style={{ minHeight: '100%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom status bar ── */}
      {phase === 'editing' && (
        <div style={{
          padding: '8px 24px', flexShrink: 0,
          borderTop: '1px solid rgba(31,31,56,0.6)',
          background: 'rgba(7,7,15,0.7)',
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <span style={{ fontSize: 10, color: 'rgba(100,100,140,0.5)', fontFamily: 'monospace' }}>
            {content.split('\n').length} lines · {content.length} chars
          </span>
          <span style={{ fontSize: 10, color: 'rgba(0,229,160,0.5)', fontFamily: 'monospace' }}>
            🔐 AES-256 · Encrypted at rest
          </span>
          {isDirty && (
            <span style={{ fontSize: 10, color: 'rgba(255,193,77,0.6)', fontFamily: 'monospace' }}>
              ● Unsaved changes
            </span>
          )}
          {file.contentVersions?.length > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(91,90,255,0.5)', fontFamily: 'monospace', marginLeft: 'auto' }}>
              <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
              {file.contentVersions.length} version{file.contentVersions.length !== 1 ? 's' : ''} saved
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FileEditor;
