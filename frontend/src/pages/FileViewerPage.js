import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Share2, Trash2, Star, Shield, AlertTriangle,
  Eye, Clock, HardDrive, FileType, Edit3,
} from 'lucide-react';
import api from '../utils/api';
import ShareModal from '../components/shared/ShareModal';
import EncryptionPanel from '../components/files/EncryptionPanel';
import FileEditor from '../components/files/FileEditor';
import { formatBytes, formatDate, getFileColor, getFileCategory, isPreviewable } from '../utils/fileUtils';
import toast from 'react-hot-toast';
 
const FileViewerPage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [file,       setFile]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showShare,  setShowShare]  = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [starred,    setStarred]    = useState(false);
  const [downloading,setDownloading]= useState(false);
  const [textContent,setTextContent]= useState(null);
 
  useEffect(() => {
    const fetchFile = async () => {
      try {
        const { data } = await api.get(`/files/${id}`);
        const f = data.data.file;
        setFile(f);
        setStarred(f.isStarred);
        if (isPreviewable(f.mimeType)) {
          try {
            const res = await api.get(`/files/${id}/preview`, { responseType: 'blob' });
            if (f.mimeType?.startsWith('text/')) {
              // Read text blob directly so we can render it with controlled styling
              const text = await res.data.text();
              setTextContent(text);
            } else {
              setPreviewUrl(URL.createObjectURL(res.data));
            }
          } catch {}
        }
      } catch {
        toast.error('File not found');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchFile();
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [id]);
 
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data: blob } = await api.get(`/files/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
    finally  { setDownloading(false); }
  };
 
  const handleStar = async () => {
    try {
      const { data } = await api.patch(`/files/${id}`, { isStarred: !starred });
      setStarred(!starred); setFile(data.data.file);
    } catch { toast.error('Failed to update'); }
  };
 
  const handleDelete = async () => {
    if (!window.confirm('Move to trash?')) return;
    try { await api.delete(`/files/${id}`); toast.success('Moved to trash'); navigate('/dashboard'); }
    catch { toast.error('Delete failed'); }
  };
 
  const color    = file ? getFileColor(file.mimeType)    : '#5b5aff';
  const category = file ? getFileCategory(file.mimeType) : 'default';
 
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030308' }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl skeleton mx-auto" />
          <p className="text-sm" style={{ color: '#8888aa' }}>Loading file…</p>
        </div>
      </div>
    );
  }
 
  if (!file) return null;
 
  const META = [
    { icon: FileType,  label: 'Type',      value: file.mimeType || 'Unknown' },
    { icon: HardDrive, label: 'Size',      value: formatBytes(file.size) },
    { icon: Clock,     label: 'Uploaded',  value: formatDate(file.createdAt) },
    { icon: Eye,       label: 'Downloads', value: file.downloadCount || 0 },
  ];
 
  return (
    <div className="min-h-screen" style={{ background: '#030308' }}>
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-20"
        style={{ background: 'rgba(3,3,8,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(22,22,42,0.6)' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost px-3 py-2 text-sm gap-2">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-2">
          {file.isTextEditable && (
            <button onClick={() => setShowEditor(true)}
              style={{ padding: '7px 14px', borderRadius: 10, background: 'rgba(91,90,255,0.12)', border: '1px solid rgba(91,90,255,0.3)', color: '#8888ff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={13} /> Edit
            </button>
          )}
          <button onClick={handleStar} className="btn-ghost px-3 py-2"
            style={{ color: starred ? '#ffb300' : undefined }}>
            <Star size={15} fill={starred ? '#ffb300' : 'none'} />
          </button>
          <button onClick={() => setShowShare(true)} className="btn-ghost px-3 py-2">
            <Share2 size={15} />
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary px-4 py-2 text-sm">
            <Download size={14} /> {downloading ? 'Downloading…' : 'Download'}
          </button>
          <button onClick={handleDelete} className="btn-danger px-3 py-2">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
 
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview area */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)', minHeight: 400 }}>
            {textContent !== null ? (
              /* ── Text file preview ── */
              <div style={{ position: 'relative', minHeight: 400 }}>
                {/* VS Code-style header bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px',
                  background: 'rgba(7,7,15,0.8)',
                  borderBottom: '1px solid rgba(91,90,255,0.15)',
                }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,95,87,0.6)' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,189,46,0.6)' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(39,201,63,0.6)' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(160,160,200,0.5)', fontFamily: 'monospace', marginLeft: 8 }}>
                    {file.name}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(91,90,255,0.6)', fontFamily: 'monospace' }}>
                    {textContent.split('\n').length} lines · {textContent.length} chars
                  </span>
                </div>
 
                {/* Content area with line numbers */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(10,10,20,0.85)',
                  minHeight: 360,
                  maxHeight: 560,
                  overflow: 'auto',
                  animation: 'fadeSlideIn 0.25s ease',
                }}>
                  <style>{`
                    @keyframes fadeSlideIn {
                      from { opacity: 0; transform: translateY(6px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                    .txt-preview-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                    .txt-preview-scroll::-webkit-scrollbar-track { background: transparent; }
                    .txt-preview-scroll::-webkit-scrollbar-thumb { background: rgba(91,90,255,0.25); border-radius: 3px; }
                    .txt-preview-scroll::-webkit-scrollbar-thumb:hover { background: rgba(91,90,255,0.45); }
                  `}</style>
 
                  {/* Line numbers gutter */}
                  <div style={{
                    flexShrink: 0, width: 52,
                    padding: '16px 0',
                    background: 'rgba(7,7,15,0.5)',
                    borderRight: '1px solid rgba(31,31,56,0.5)',
                    userSelect: 'none',
                  }}>
                    {textContent.split('\n').map((_, i) => (
                      <div key={i} style={{
                        fontSize: 12, lineHeight: '1.7',
                        color: 'rgba(100,100,140,0.35)',
                        textAlign: 'right',
                        paddingRight: 10, paddingLeft: 8,
                        fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                      }}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
 
                  {/* Text content */}
                  <pre className="txt-preview-scroll" style={{
                    flex: 1,
                    margin: 0,
                    padding: '16px 20px',
                    color: '#d4d4f0',
                    background: 'transparent',
                    fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                    fontSize: 13,
                    lineHeight: '1.7',
                    whiteSpace: 'pre',
                    overflowX: 'auto',
                    overflowY: 'visible',
                  }}>
                    {textContent}
                  </pre>
                </div>
              </div>
            ) : previewUrl ? (
              file.mimeType?.startsWith('image/') ? (
                <img src={previewUrl} alt={file.name} className="w-full h-full object-contain" style={{ maxHeight: 600 }} />
              ) : file.mimeType?.startsWith('video/') ? (
                <video src={previewUrl} controls className="w-full" style={{ maxHeight: 600 }} />
              ) : file.mimeType?.startsWith('audio/') ? (
                <div className="flex items-center justify-center p-12"><audio src={previewUrl} controls /></div>
              ) : file.mimeType === 'application/pdf' ? (
                <iframe src={previewUrl} title="PDF Preview" className="w-full" style={{ height: 600, border: 'none' }} />
              ) : (
                <iframe src={previewUrl} title="Preview" className="w-full" style={{ height: 600, border: 'none', background: '#fff' }} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" style={{ width: 44, height: 44 }}>
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                </div>
                <p className="text-sm font-medium mb-2" style={{ color: '#8888aa' }}>No preview available</p>
                {file.isTextEditable && (
                  <button onClick={() => setShowEditor(true)}
                    style={{ marginTop: 8, padding: '9px 20px', borderRadius: 12, background: 'rgba(91,90,255,0.1)', border: '1px solid rgba(91,90,255,0.25)', color: '#8888ff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Edit3 size={13} /> Open in Secure Editor
                  </button>
                )}
                <button onClick={handleDownload} className="btn-primary mt-3 text-sm">
                  <Download size={14} /> Download to view
                </button>
              </div>
            )}
          </div>
        </div>
 
        {/* Sidebar */}
        <div className="space-y-4">
          {/* File info */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: '#f0f0ff', letterSpacing: '-0.01em' }}>{file.name}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: '#8888aa' }}>{category}</p>
              </div>
            </div>
            <div className="space-y-3">
              {META.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color: '#444460' }} />
                    <span className="text-xs" style={{ color: '#8888aa' }}>{label}</span>
                  </div>
                  <span className="text-xs font-medium truncate max-w-32" style={{ color: '#f0f0ff' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
 
          {/* Encryption Panel */}
          <EncryptionPanel file={file} onFileUpdate={setFile} />
 
          {/* Version History */}
          {file.contentVersions?.length > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(91,90,255,0.15)', backdropFilter: 'blur(20px)' }}>
              <p className="text-xs font-semibold mb-3"
                style={{ color: '#8888aa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Version History
              </p>
              <div className="space-y-2">
                {[...file.contentVersions].reverse().slice(0, 5).map((v, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(91,90,255,0.1)', border: '1px solid rgba(91,90,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, color: '#5b5aff', fontWeight: 700 }}>v{v.version}</span>
                      </div>
                      <span className="text-xs" style={{ color: '#8888aa' }}>{formatBytes(v.size || 0)}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: '#444460' }}>{formatDate(v.editedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
 
          {/* Shared with */}
          {file.sharedWith?.length > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
              <p className="text-xs font-semibold mb-3"
                style={{ color: '#8888aa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Shared with
              </p>
              <div className="flex flex-wrap gap-2">
                {file.sharedWith.slice(0, 5).map((s, i) => (
                  <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    title={s.user?.email}
                    style={{ background: 'linear-gradient(135deg, #5b5aff, #7b6aff)' }}>
                    {s.user?.name?.charAt(0).toUpperCase()}
                  </div>
                ))}
                {file.sharedWith.length > 5 && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(22,22,42,0.8)', color: '#8888aa' }}>
                    +{file.sharedWith.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
 
      {showShare && <ShareModal file={file} onClose={() => setShowShare(false)} onUpdate={setFile} />}
      {showEditor && (
        <FileEditor
          file={file}
          onClose={() => setShowEditor(false)}
          onSaved={(updated) => { setFile(updated); setShowEditor(false); }}
        />
      )}
    </div>
  );
};
 
export default FileViewerPage;