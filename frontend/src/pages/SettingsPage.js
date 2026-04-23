import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import { ArrowLeft, User, Shield, Activity, Eye, EyeOff, Check, Lock, ChevronRight, LogOut, Smartphone, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/fileUtils';

const SettingsNav = [
  { path: '/settings', label: 'Profile', icon: User, exact: true },
  { path: '/settings/security', label: 'Security', icon: Shield },
  { path: '/settings/activity', label: 'Activity', icon: Activity },
];

const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/profile', form);
      updateUser(data.data.user); toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>Profile</h2>
        <p className="text-sm" style={{ color: '#8888aa' }}>Manage your account information</p>
      </div>

      {/* Avatar card */}
      <div className="flex items-center gap-5 p-5 rounded-2xl" style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold"
          style={{ background: 'linear-gradient(135deg, #5b5aff, #7b6aff)', boxShadow: '0 0 24px rgba(91,90,255,0.3)' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold" style={{ color: '#f0f0ff' }}>{user?.name}</p>
          <p className="text-sm" style={{ color: '#8888aa' }}>{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: user?.isEmailVerified ? '#00c9a7' : '#ffb300' }} />
            <span className="text-xs" style={{ color: '#8888aa' }}>{user?.isEmailVerified ? 'Verified' : 'Unverified'}</span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8888aa' }}>Display Name</label>
          <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="input-field" placeholder="Your name" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8888aa' }}>Email Address</label>
          <input type="email" value={user?.email || ''} disabled className="input-field" style={{ opacity: 0.5, cursor: 'not-allowed' }} />
          <p className="text-xs mt-1" style={{ color: '#444460' }}>Email cannot be changed</p>
        </div>
        <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary">
          <Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const SecuritySettings = () => {
  const { user, updateUser } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.patch('/users/change-password', pwForm);
      toast.success('Password changed'); setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  const handleToggle2FA = async () => {
    setToggling2FA(true);
    try {
      const { data } = await api.patch('/auth/toggle-2fa', { enable: !user?.twoFactorEnabled });
      updateUser({ twoFactorEnabled: data.data.twoFactorEnabled });
      toast.success(data.data.twoFactorEnabled ? '2FA enabled' : '2FA disabled');
    } catch { toast.error('Failed to toggle 2FA'); }
    finally { setToggling2FA(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>Security</h2>
        <p className="text-sm" style={{ color: '#8888aa' }}>Manage your security settings</p>
      </div>

      {/* 2FA */}
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91,90,255,0.1)', border: '1px solid rgba(91,90,255,0.2)' }}>
              <Smartphone size={16} style={{ color: '#5b5aff' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#f0f0ff' }}>Two-Factor Authentication</p>
              <p className="text-xs" style={{ color: '#8888aa' }}>Extra layer of account security</p>
            </div>
          </div>
          <button onClick={handleToggle2FA} disabled={toggling2FA}
            className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
            style={{ background: user?.twoFactorEnabled ? '#5b5aff' : 'rgba(22,22,42,0.9)', border: 'none', cursor: 'pointer' }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: user?.twoFactorEnabled ? '26px' : '2px' }} />
          </button>
        </div>
        {user?.twoFactorEnabled && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(0,201,167,0.06)', border: '1px solid rgba(0,201,167,0.15)' }}>
            <Check size={13} style={{ color: '#00c9a7' }} />
            <span className="text-xs" style={{ color: '#00c9a7' }}>2FA is active — your account is protected</span>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91,90,255,0.1)', border: '1px solid rgba(91,90,255,0.2)' }}>
            <Lock size={16} style={{ color: '#5b5aff' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f0f0ff' }}>Change Password</p>
            <p className="text-xs" style={{ color: '#8888aa' }}>Use a strong, unique password</p>
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Current password" className="input-field pr-11" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#444460' }}>
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="New password (min 8 chars)" className="input-field pr-11" />
            <button type="button" onClick={() => setShowNew(!showNew)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#444460' }}>
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button type="submit" disabled={saving || !pwForm.currentPassword || !pwForm.newPassword} className="btn-primary">
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

const ActivitySettings = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/audit-log').then(({ data }) => setLogs(data.data.logs || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const ACTION_COLORS = {
    login: '#00c9a7', logout: '#8888aa', upload: '#5b5aff',
    download: '#b06aff', delete: '#ff3860', share: '#ffb300',
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>Activity Log</h2>
        <p className="text-sm" style={{ color: '#8888aa' }}>Recent account activity</p>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(12,12,24,0.7)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle size={32} style={{ color: '#444460', margin: '0 auto 12px' }} />
              <p className="text-sm" style={{ color: '#8888aa' }}>No activity yet</p>
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(22,22,42,0.6)' }}>
            {logs.map((log, i) => {
              const actionKey = Object.keys(ACTION_COLORS).find(k => log.action?.toLowerCase().includes(k)) || 'default';
              const color = ACTION_COLORS[actionKey] || '#8888aa';
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4 transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,22,42,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: '#f0f0ff' }}>{log.action}</p>
                    {log.metadata?.fileName && <p className="text-xs truncate" style={{ color: '#8888aa' }}>{log.metadata.fileName}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: '#8888aa' }}>{formatDate(log.createdAt)}</p>
                    {log.ipAddress && <p className="text-xs" style={{ color: '#444460', fontFamily: "'JetBrains Mono', monospace" }}>{log.ipAddress}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#030308' }}>
      {/* Top nav */}
      <div className="flex items-center gap-4 px-6 py-4 sticky top-0 z-20" style={{ background: 'rgba(3,3,8,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(22,22,42,0.6)' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost px-3 py-2 text-sm gap-2">
          <ArrowLeft size={15} /> Back
        </button>
        <h1 className="text-base font-bold" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>Settings</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1 sticky top-24">
            {SettingsNav.map(({ path, label, icon: Icon, exact }) => (
              <NavLink key={path} to={path} end={exact}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(91,90,255,0.1)' : 'transparent',
                  color: isActive ? '#f0f0ff' : '#8888aa',
                  border: isActive ? '1px solid rgba(91,90,255,0.2)' : '1px solid transparent',
                })}>
                <Icon size={15} /> {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Routes>
            <Route index element={<ProfileSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="activity" element={<ActivitySettings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
