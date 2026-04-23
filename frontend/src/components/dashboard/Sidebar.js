import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Files, Star, Trash2, Share2, Settings, LogOut, HardDrive, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatBytes } from '../../utils/fileUtils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', exact: true },
  { icon: Files, label: 'My Files', path: '/dashboard/files' },
  { icon: Share2, label: 'Shared', path: '/dashboard/shared' },
  { icon: Star, label: 'Starred', path: '/dashboard/starred' },
  { icon: Trash2, label: 'Trash', path: '/dashboard/trash' },
];

const Sidebar = ({ onUpload, stats }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(-20px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)';
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
    });
  }, []);

  const storagePercent = stats ? Math.min((stats.storageUsed / stats.storageLimit) * 100, 100) : 0;
  const handleLogout = async () => { await logout(); navigate('/auth'); };

  return (
    <aside ref={sidebarRef} className="w-64 h-screen flex flex-col flex-shrink-0" style={{ background: 'rgba(7,7,15,0.95)', borderRight: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
      {/* Logo */}
      <div className="p-5 mb-1" style={{ borderBottom: '1px solid rgba(22,22,42,0.6)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5b5aff, #7b6aff)', boxShadow: '0 0 20px rgba(91,90,255,0.3)' }}>
            <Shield size={17} color="white" />
          </div>
          <div>
            <p className="font-bold text-base leading-none" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>SecureVault</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: '#5b5aff', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>AES-256</p>
          </div>
        </div>
      </div>

      {/* Upload button */}
      <div className="px-4 pt-4 pb-2">
        <button onClick={onUpload} className="btn-primary w-full justify-center py-2.5 text-sm">
          <Plus size={15} /> Upload Files
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, path, exact }) => (
          <NavLink key={path} to={path} end={exact}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${isActive ? '' : 'hover:bg-white/4'}`}
            style={({ isActive }) => isActive ? {
              background: 'rgba(91,90,255,0.1)', color: '#f0f0ff',
              border: '1px solid rgba(91,90,255,0.2)', borderRadius: '12px',
            } : { color: '#8888aa', border: '1px solid transparent', borderRadius: '12px' }}>
            {({ isActive }) => (
              <>
                {isActive && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, background: 'linear-gradient(180deg, #5b5aff, #00c9a7)', borderRadius: '0 2px 2px 0' }} />}
                <Icon size={16} style={{ color: isActive ? '#5b5aff' : '#8888aa', transition: 'color 0.2s' }} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={13} style={{ color: 'rgba(91,90,255,0.5)' }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Storage */}
      {stats && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(22,22,42,0.6)' }}>
          <div className="rounded-xl p-3" style={{ background: 'rgba(12,12,24,0.6)', border: '1px solid rgba(22,22,42,0.8)' }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <HardDrive size={13} style={{ color: '#5b5aff' }} />
                <span className="text-xs font-medium" style={{ color: '#8888aa' }}>Storage</span>
              </div>
              <span className="text-xs font-mono" style={{ color: '#8888aa' }}>{Math.round(storagePercent)}%</span>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(22,22,42,0.9)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${storagePercent}%`, background: storagePercent > 80 ? 'linear-gradient(90deg, #ff3860, #ff8080)' : 'linear-gradient(90deg, #5b5aff, #00c9a7)' }} />
            </div>
            <p className="text-xs" style={{ color: '#444460' }}>{formatBytes(stats.storageUsed)} / {formatBytes(stats.storageLimit)}</p>
          </div>
        </div>
      )}

      {/* User */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(22,22,42,0.6)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1" style={{ background: 'rgba(12,12,24,0.5)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #5b5aff, #7b6aff)' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#f0f0ff' }}>{user?.name}</p>
            <p className="text-xs truncate" style={{ color: '#444460' }}>{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <NavLink to="/settings" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ color: '#8888aa' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,22,42,0.6)'; e.currentTarget.style.color = '#f0f0ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8888aa'; }}>
            <Settings size={13} /> Settings
          </NavLink>
          <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ color: 'rgba(255,56,96,0.7)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,56,96,0.08)'; e.currentTarget.style.color = '#ff3860'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,56,96,0.7)'; }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
