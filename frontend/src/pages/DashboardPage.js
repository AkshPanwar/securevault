import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Search, Grid, List, Filter, RefreshCw, Star, Share2, Trash2, Files, Plus, SlidersHorizontal } from 'lucide-react';
import Sidebar from '../components/dashboard/Sidebar';
import StatsCards from '../components/dashboard/StatsCards';
import ThreatMonitor from '../components/dashboard/ThreatMonitor';
import FileCard from '../components/files/FileCard';
import UploadModal from '../components/files/UploadModal';
import ShareModal from '../components/shared/ShareModal';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt',  label: 'Oldest first' },
  { value: 'name',       label: 'Name A–Z' },
  { value: '-name',      label: 'Name Z–A' },
  { value: '-size',      label: 'Largest first' },
  { value: 'size',       label: 'Smallest first' },
];

const TrashFileCard = ({ file, view, onRestore, onDelete }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl transition-all ${view === 'grid' ? 'flex-col text-center' : ''}`}
    style={{ background:'rgba(12,12,24,0.6)', border:'1px solid rgba(22,22,42,0.7)', opacity:0.8 }}>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate" style={{ color:'#f0f0ff' }}>{file.name}</p>
      <p className="text-xs mt-0.5" style={{ color:'#ff3860' }}>In trash</p>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={() => onRestore(file._id)} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
        style={{ background:'rgba(0,201,167,0.1)', color:'#00c9a7', border:'1px solid rgba(0,201,167,0.2)', cursor:'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(0,201,167,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background='rgba(0,201,167,0.1)'}>
        Restore
      </button>
      <button onClick={() => onDelete(file._id)} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
        style={{ background:'rgba(255,56,96,0.08)', color:'#ff3860', border:'1px solid rgba(255,56,96,0.2)', cursor:'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,56,96,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background='rgba(255,56,96,0.08)'}>
        Delete forever
      </button>
    </div>
  </div>
);

const FilesView = ({ folder, title, emptyMsg, isShared }) => {
  const [files,       setFiles]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState('-createdAt');
  const [view,        setView]        = useState('grid');
  const [showUpload,  setShowUpload]  = useState(false);
  const [shareFile,   setShareFile]   = useState(null);
  const [showSortMenu,setShowSortMenu]= useState(false);
  const sortRef   = useRef(null);
  const headerRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder, sort });
      if (search) params.set('search', search);
      const { data } = await api.get(`/files?${params}`);
      const allFiles = folder === 'shared' ? data.data.sharedFiles : data.data.files;
      setFiles(allFiles || []);
    } catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  }, [folder, sort, search]);

  const fetchStats = useCallback(async () => {
    try { const { data } = await api.get('/files/stats'); setStats(data.data); } catch {}
  }, []);

  useEffect(() => { fetchFiles(); fetchStats(); }, [fetchFiles, fetchStats]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    el.style.opacity = '0'; el.style.transform = 'translateY(-8px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    });
  }, [folder]);

  useEffect(() => {
    const handleClick = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortMenu(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDelete = async (fileId) => {
    if (!window.confirm('Move this file to trash?')) return;
    try { await api.delete(`/files/${fileId}`); setFiles(prev => prev.filter(f => f._id !== fileId)); toast.success('Moved to trash'); fetchStats(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleRestore = async (fileId) => {
    try { await api.patch(`/files/${fileId}/restore`); setFiles(prev => prev.filter(f => f._id !== fileId)); toast.success('File restored'); fetchStats(); }
    catch { toast.error('Restore failed'); }
  };

  const handlePermanentDelete = async (fileId) => {
    if (!window.confirm('Permanently delete? This cannot be undone.')) return;
    try { await api.delete(`/files/${fileId}?permanent=true`); setFiles(prev => prev.filter(f => f._id !== fileId)); toast.success('Permanently deleted'); fetchStats(); }
    catch { toast.error('Delete failed'); }
  };

  const handleUpdate = (updatedFile) => setFiles(prev => prev.map(f => f._id === updatedFile._id ? updatedFile : f));

  const TITLE_ICONS = { 'My Files':Files, 'Shared':Share2, 'Starred':Star, 'Trash':Trash2, 'Dashboard':Files };
  const TitleIcon = TITLE_ICONS[title] || Files;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div ref={headerRef} className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom:'1px solid rgba(22,22,42,0.5)' }}>
        {folder === 'root' && (
          <div className="mb-5 animate-slide-up">
            <StatsCards stats={stats} />
          </div>
        )}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'rgba(91,90,255,0.1)', border:'1px solid rgba(91,90,255,0.2)' }}>
              <TitleIcon size={15} style={{ color:'#5b5aff' }} />
            </div>
            <h1 className="text-lg font-bold" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif', letterSpacing:'-0.02em' }}>{title}</h1>
            {!loading && (
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium" style={{ background:'rgba(22,22,42,0.8)', color:'#8888aa', border:'1px solid rgba(31,31,56,0.6)' }}>
                {files.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'#444460' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search files…" className="input-field text-xs pl-9 pr-4 py-2 w-44 focus:w-60 transition-all duration-300"
                style={{ borderRadius:10 }} />
            </div>
            <div className="relative" ref={sortRef}>
              <button onClick={() => setShowSortMenu(!showSortMenu)} className="btn-ghost py-2 px-3 text-xs gap-1.5">
                <SlidersHorizontal size={13} /> Sort
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-10 w-44 rounded-xl py-1.5 z-20 animate-scale-in"
                  style={{ background:'rgba(12,12,24,0.98)', border:'1px solid rgba(31,31,56,0.9)', backdropFilter:'blur(20px)', boxShadow:'0 16px 48px rgba(0,0,0,0.7)' }}>
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium transition-colors"
                      style={{ color: sort === opt.value ? '#5b5aff' : '#8888aa', background:'none', border:'none', cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(31,31,56,0.5)'}
                      onMouseLeave={e => e.currentTarget.style.background='none'}>
                      {sort === opt.value && '✓ '}{opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex rounded-xl overflow-hidden" style={{ background:'rgba(7,7,15,0.7)', border:'1px solid rgba(22,22,42,0.9)' }}>
              {[{ icon:Grid, val:'grid' }, { icon:List, val:'list' }].map(({ icon:Icon, val }) => (
                <button key={val} onClick={() => setView(val)} className="p-2 transition-all duration-200"
                  style={{ background: view === val ? 'rgba(91,90,255,0.2)' : 'transparent', color: view === val ? '#5b5aff' : '#444460', border:'none', cursor:'pointer' }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
            <button onClick={() => { fetchFiles(); fetchStats(); }} className="btn-ghost py-2 px-3" title="Refresh">
              <RefreshCw size={13} />
            </button>
            {folder !== 'trash' && folder !== 'shared' && (
              <button onClick={() => setShowUpload(true)} className="btn-primary py-2 px-3 text-xs">
                <Plus size={13} /> Upload
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content area: files + threat monitor side panel on dashboard */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}>
              {[...Array(10)].map((_, i) => <div key={i} className={`skeleton ${view === 'grid' ? 'h-48 rounded-2xl' : 'h-14 rounded-xl'}`} />)}
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background:'rgba(12,12,24,0.8)', border:'1px solid rgba(22,22,42,0.8)' }}>
                <TitleIcon size={30} style={{ color:'#444460' }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif', letterSpacing:'-0.02em' }}>Nothing here</h3>
              <p className="text-sm max-w-xs" style={{ color:'#8888aa' }}>{emptyMsg}</p>
              {folder === 'root' && (
                <button onClick={() => setShowUpload(true)} className="btn-primary mt-6">
                  <Plus size={15} /> Upload your first file
                </button>
              )}
            </div>
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}>
              {files.map(file => (
                folder === 'trash' ? (
                  <TrashFileCard key={file._id} file={file} view={view} onRestore={handleRestore} onDelete={handlePermanentDelete} />
                ) : (
                  <FileCard key={file._id} file={file} view={view} isShared={isShared}
                    onDelete={handleDelete} onShare={f => setShareFile(f)} onUpdate={handleUpdate} />
                )
              ))}
            </div>
          )}
        </div>

        {/* ── Threat Monitor side panel (dashboard only) ── */}
        {folder === 'root' && (
          <div className="hidden xl:block w-80 flex-shrink-0 overflow-y-auto px-4 py-5" style={{ borderLeft:'1px solid rgba(22,22,42,0.5)' }}>
            <ThreatMonitor stats={stats} recentFiles={files.slice(0, 5)} />
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { fetchFiles(); fetchStats(); }} />}
      {shareFile  && <ShareModal file={shareFile} onClose={() => setShareFile(null)} onUpdate={f => { handleUpdate(f); setShareFile(f); }} />}
    </div>
  );
};

const DashboardLayout = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [stats,      setStats]      = useState(null);
  const fetchStats = useCallback(async () => {
    try { const { data } = await api.get('/files/stats'); setStats(data.data); } catch {}
  }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'#030308' }}>
      <Sidebar onUpload={() => setShowUpload(true)} stats={stats} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Routes>
          <Route index          element={<FilesView folder="root"   title="Dashboard" emptyMsg="Upload files to get started. All files are encrypted with AES-256." />} />
          <Route path="files"   element={<FilesView folder="all"    title="My Files"  emptyMsg="No files yet. Upload your first file to get started." />} />
          <Route path="shared"  element={<FilesView folder="shared" title="Shared"    emptyMsg="No files have been shared with you yet." isShared />} />
          <Route path="starred" element={<FilesView folder="all"    title="Starred"   emptyMsg="Star important files to find them quickly." />} />
          <Route path="trash"   element={<FilesView folder="trash"  title="Trash"     emptyMsg="Trash is empty." />} />
        </Routes>
      </main>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={fetchStats} />}
    </div>
  );
};

export default DashboardLayout;
