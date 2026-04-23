import React, { useState } from 'react';
import { X, Share2, Link, Copy, Trash2, Eye, Download, Edit3, UserPlus, Check, Globe, Users } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/fileUtils';

const PERMISSIONS = [
  { value: 'view', label: 'View only', icon: Eye },
  { value: 'download', label: 'Download', icon: Download },
  { value: 'edit', label: 'Edit', icon: Edit3 },
];

const ShareModal = ({ file, onClose, onUpdate }) => {
  const [tab, setTab] = useState('people');
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [publicLink, setPublicLink] = useState(
    file?.publicLink?.enabled ? `${window.location.origin}/shared/${file.publicLink.token}` : null
  );

  const handleShare = async () => {
    if (!email.match(/^\S+@\S+\.\S+$/)) return toast.error('Invalid email address');
    setSharing(true);
    try {
      const { data } = await api.post(`/shares/${file._id}/share`, { email, permission });
      toast.success(`Shared with ${email}`); setEmail(''); onUpdate?.(data.data.file);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to share'); }
    finally { setSharing(false); }
  };

  const handleUnshare = async (userId) => {
    try {
      await api.delete(`/shares/${file._id}/share/${userId}`);
      toast.success('Access revoked');
      onUpdate?.({ ...file, sharedWith: file.sharedWith.filter(s => s.user?._id !== userId) });
    } catch { toast.error('Failed to revoke access'); }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const { data } = await api.post(`/shares/${file._id}/public-link`, { expiresIn: 168 });
      const link = `${window.location.origin}/shared/${data.data.token}`;
      setPublicLink(link); toast.success('Public link created');
      onUpdate?.({ ...file, publicLink: { enabled: true, token: data.data.token } });
    } catch { toast.error('Failed to generate link'); }
    finally { setGeneratingLink(false); }
  };

  const handleRevokeLink = async () => {
    try {
      await api.delete(`/shares/${file._id}/public-link`);
      setPublicLink(null); toast.success('Public link revoked');
      onUpdate?.({ ...file, publicLink: { enabled: false } });
    } catch { toast.error('Failed to revoke link'); }
  };

  const copyLink = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink);
    setCopied(true); toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,3,8,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-md rounded-2xl animate-scale-in" style={{ background: 'rgba(12,12,24,0.98)', border: '1px solid rgba(31,31,56,0.9)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', backdropFilter: 'blur(24px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(22,22,42,0.8)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91,90,255,0.1)', border: '1px solid rgba(91,90,255,0.2)' }}>
              <Share2 size={16} style={{ color: '#5b5aff' }} />
            </div>
            <div>
              <h2 className="font-semibold text-base" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em' }}>Share File</h2>
              <p className="text-xs truncate max-w-48" style={{ color: '#8888aa' }}>{file?.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#8888aa' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,22,42,0.6)'; e.currentTarget.style.color = '#f0f0ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#8888aa'; }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mt-5 rounded-xl p-1" style={{ background: 'rgba(7,7,15,0.7)', border: '1px solid rgba(22,22,42,0.9)' }}>
          {[{ id: 'people', label: 'People', icon: Users }, { id: 'link', label: 'Link', icon: Globe }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: tab === t.id ? 'rgba(91,90,255,0.15)' : 'transparent',
                color: tab === t.id ? '#f0f0ff' : '#8888aa',
                border: tab === t.id ? '1px solid rgba(91,90,255,0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'people' ? (
            <>
              {/* Add person */}
              <div className="space-y-3">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleShare()}
                  placeholder="Email address" className="input-field" />
                <div className="flex gap-2">
                  {PERMISSIONS.map(p => (
                    <button key={p.value} onClick={() => setPermission(p.value)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: permission === p.value ? 'rgba(91,90,255,0.12)' : 'rgba(7,7,15,0.5)',
                        border: `1px solid ${permission === p.value ? 'rgba(91,90,255,0.3)' : 'rgba(22,22,42,0.8)'}`,
                        color: permission === p.value ? '#f0f0ff' : '#8888aa',
                        cursor: 'pointer',
                      }}>
                      <p.icon size={12} /> {p.label}
                    </button>
                  ))}
                </div>
                <button onClick={handleShare} disabled={sharing || !email}
                  className="btn-primary w-full justify-center">
                  <UserPlus size={14} /> {sharing ? 'Sharing...' : 'Share'}
                </button>
              </div>

              {/* Shared with list */}
              {file?.sharedWith?.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(22,22,42,0.6)', paddingTop: 16 }}>
                  <p className="text-xs font-medium mb-3" style={{ color: '#8888aa' }}>Shared with</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {file.sharedWith.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(7,7,15,0.5)', border: '1px solid rgba(22,22,42,0.6)' }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5b5aff, #7b6aff)' }}>
                          {s.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: '#f0f0ff' }}>{s.user?.name}</p>
                          <p className="text-xs truncate" style={{ color: '#444460' }}>{s.user?.email}</p>
                        </div>
                        <span className="tag text-xs" style={{ background: 'rgba(91,90,255,0.1)', color: '#5b5aff', border: '1px solid rgba(91,90,255,0.2)', padding: '2px 8px', borderRadius: 99, fontSize: 10 }}>
                          {s.permission}
                        </span>
                        <button onClick={() => handleUnshare(s.user?._id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3860', padding: 4, borderRadius: 6, display: 'flex' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,56,96,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {publicLink ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(7,7,15,0.6)', border: '1px solid rgba(22,22,42,0.8)' }}>
                    <Link size={13} style={{ color: '#5b5aff', flexShrink: 0 }} />
                    <p className="text-xs truncate flex-1" style={{ color: '#8888aa', fontFamily: "'JetBrains Mono', monospace" }}>{publicLink}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyLink} className="btn-primary flex-1 justify-center text-sm">
                      {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                    </button>
                    <button onClick={handleRevokeLink} className="btn-danger justify-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-center" style={{ color: '#444460' }}>Link expires in 7 days · Anyone with the link can view</p>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(91,90,255,0.08)', border: '1px solid rgba(91,90,255,0.15)' }}>
                    <Globe size={22} style={{ color: '#5b5aff' }} />
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#f0f0ff' }}>No public link</p>
                  <p className="text-xs mb-5" style={{ color: '#8888aa' }}>Generate a link to share this file with anyone</p>
                  <button onClick={handleGenerateLink} disabled={generatingLink} className="btn-primary mx-auto">
                    <Link size={14} /> {generatingLink ? 'Generating...' : 'Create Public Link'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
