import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Download, Trash2, Share2, Star, Eye, Edit3, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatBytes, formatDate, getFileColor, getFileCategory } from '../../utils/fileUtils';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const FILE_ICONS = {
  image: (color) => <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  video: (color) => <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-7 h-7"><rect x="2" y="4" width="14" height="16" rx="2"/><path d="M16 8l5-3v14l-5-3"/></svg>,
  audio: (color) => <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-7 h-7"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  document: (color) => <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-7 h-7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  archive: (color) => <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-7 h-7"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  code: (color) => <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-7 h-7"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  default: (color) => <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-7 h-7"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
};

const FileCard = ({ file, view = 'grid', onDelete, onShare, onUpdate, isShared }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [starred, setStarred] = useState(file.isStarred);
  const menuRef = useRef(null);
  const cardRef = useRef(null);
  const color = getFileColor(file.mimeType);
  const category = getFileCategory(file.mimeType);
  const IconFn = FILE_ICONS[category] || FILE_ICONS.default;

  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    const timer = setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 30);
    return () => clearTimeout(timer);
  }, []);

  const handleStar = async (e) => {
    e.stopPropagation();
    try {
      const { data } = await api.patch(`/files/${file._id}`, { isStarred: !starred });
      setStarred(!starred);
      onUpdate?.(data.data.file);
    } catch { toast.error('Failed to update star'); }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const { data: blob } = await api.get(`/files/${file._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
    setMenuOpen(false);
  };

  const handleRename = async (e) => {
    e.stopPropagation();
    const newName = window.prompt('Rename file:', file.name);
    if (!newName || newName === file.name) return;
    try {
      const { data } = await api.patch(`/files/${file._id}`, { name: newName });
      onUpdate?.(data.data.file); toast.success('File renamed');
    } catch { toast.error('Rename failed'); }
    setMenuOpen(false);
  };

  if (view === 'list') {
    return (
      <div ref={cardRef} className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer group transition-all duration-200"
        style={{ background: 'rgba(12,12,24,0.6)', border: '1px solid rgba(22,22,42,0.7)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(91,90,255,0.2)'; e.currentTarget.style.background = 'rgba(12,12,24,0.85)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,22,42,0.7)'; e.currentTarget.style.background = 'rgba(12,12,24,0.6)'; }}
        onClick={() => navigate(`/files/${file._id}`)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
          {IconFn(color)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#f0f0ff' }}>{file.name}</p>
          <p className="text-xs" style={{ color: '#444460' }}>{formatDate(file.createdAt)} · {formatBytes(file.size)}</p>
        </div>
        {file.isEncrypted && <Shield size={13} style={{ color: '#00c9a7', opacity: 0.6 }} />}
        {file.isMalicious && <AlertTriangle size={13} style={{ color: '#ff3860' }} />}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleStar} className="p-1.5 rounded-lg transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: starred ? '#ffb300' : '#8888aa' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,22,42,0.6)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Star size={14} fill={starred ? '#ffb300' : 'none'} />
          </button>
          <button onClick={handleDownload} className="p-1.5 rounded-lg transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888aa' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,22,42,0.6)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Download size={14} />
          </button>
          {!isShared && (
            <button onClick={e => { e.stopPropagation(); onShare?.(file); }} className="p-1.5 rounded-lg" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888aa' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,22,42,0.6)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Share2 size={14} />
            </button>
          )}
          {!isShared && (
            <button onClick={e => { e.stopPropagation(); onDelete?.(file._id); }} className="p-1.5 rounded-lg" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3860' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,56,96,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="relative group rounded-2xl cursor-pointer transition-all duration-300"
      style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)', overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(91,90,255,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,22,42,0.8)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      onClick={() => navigate(`/files/${file._id}`)}>
      
      {/* Color accent top bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.6 }} />

      {/* Icon area */}
      <div className="flex items-center justify-center p-6 pb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
          {IconFn(color)}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-4">
        <p className="text-sm font-medium truncate mb-1" style={{ color: '#f0f0ff', letterSpacing: '-0.01em' }}>{file.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#444460' }}>{formatBytes(file.size)}</span>
          {file.securityScore != null ? (
            <span className="text-xs font-mono font-semibold" style={{
              color: file.securityScore >= 80 ? '#00e5a0' : file.securityScore >= 50 ? '#ffc14d' : '#ff4060',
            }}>
              {file.securityScore}%
            </span>
          ) : (
            <span className="text-xs" style={{ color: '#444460' }}>{formatDate(file.createdAt)}</span>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="absolute top-4 left-4 flex items-center gap-1">
        {file.isEncrypted && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)' }}>
            <Shield size={10} style={{ color: '#00c9a7' }} />
            <span className="text-xs font-medium" style={{ color: '#00c9a7', fontSize: 10 }}>Enc</span>
          </div>
        )}
        {file.isMalicious && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,56,96,0.1)', border: '1px solid rgba(255,56,96,0.2)' }}>
            <AlertTriangle size={10} style={{ color: '#ff3860' }} />
          </div>
        )}
      </div>

      {/* Top right actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button onClick={handleStar} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(12,12,24,0.9)', border: '1px solid rgba(22,22,42,0.8)', color: starred ? '#ffb300' : '#8888aa', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); handleStar(e); }}>
          <Star size={13} fill={starred ? '#ffb300' : 'none'} />
        </button>

        {!isShared && (
          <div className="relative" ref={menuRef}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(12,12,24,0.9)', border: '1px solid rgba(22,22,42,0.8)', color: '#8888aa', cursor: 'pointer' }}>
              <MoreVertical size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-40 rounded-xl py-1 z-50 animate-scale-in"
                style={{ background: 'rgba(12,12,24,0.98)', border: '1px solid rgba(31,31,56,0.9)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
                {[
                  { icon: Eye, label: 'Preview', action: e => { e.stopPropagation(); navigate(`/files/${file._id}`); setMenuOpen(false); }, color: '#f0f0ff' },
                  { icon: Download, label: 'Download', action: handleDownload, color: '#f0f0ff' },
                  { icon: Share2, label: 'Share', action: e => { e.stopPropagation(); onShare?.(file); setMenuOpen(false); }, color: '#f0f0ff' },
                  { icon: Edit3, label: 'Rename', action: handleRename, color: '#f0f0ff' },
                  ...(file.isTextEditable ? [{ icon: Edit3, label: 'Edit Content', action: e => { e.stopPropagation(); navigate(`/files/${file._id}`); setMenuOpen(false); }, color: '#8888ff' }] : []),
                  { icon: Trash2, label: 'Delete', action: e => { e.stopPropagation(); onDelete?.(file._id); setMenuOpen(false); }, color: '#ff3860' },
                ].map(({ icon: Icon, label, action, color: c }) => (
                  <button key={label} onClick={action} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{ color: c, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(31,31,56,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileCard;
