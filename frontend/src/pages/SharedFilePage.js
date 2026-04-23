import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Download, AlertCircle, Clock, HardDrive, User } from 'lucide-react';
import api from '../utils/api';
import { formatBytes, formatDate } from '../utils/fileUtils';
import toast from 'react-hot-toast';

const SharedFilePage = () => {
  const { token } = useParams();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const { data } = await api.get(`/shares/public/${token}`);
        setFileData(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Link not found or expired');
      } finally { setLoading(false); }
    };
    fetchFile();
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    try { toast('Please log in to download this file', { icon: '🔐' }); }
    catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: '#030308' }}>
      {/* Orbs */}
      <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', width: 400, height: 400, background: '#5b5aff', opacity: 0.06, top: '20%', left: '50%', transform: 'translateX(-50%)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5b5aff, #7b6aff)', boxShadow: '0 0 20px rgba(91,90,255,0.35)' }}>
            <Shield size={17} color="white" />
          </div>
          <span className="font-bold text-lg" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>SecureVault</span>
        </div>

        {loading ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(12,12,24,0.8)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
            <div className="w-8 h-8 rounded-full border-2 mx-auto mb-4 animate-spin" style={{ borderColor: 'rgba(91,90,255,0.2)', borderTopColor: '#5b5aff' }} />
            <p className="text-sm" style={{ color: '#8888aa' }}>Loading shared file…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl p-8 text-center animate-slide-up" style={{ background: 'rgba(12,12,24,0.8)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,56,96,0.08)', border: '1px solid rgba(255,56,96,0.2)' }}>
              <AlertCircle size={28} style={{ color: '#ff3860' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>Link Unavailable</h2>
            <p className="text-sm mb-5" style={{ color: '#8888aa' }}>{error}</p>
            <a href="/auth" className="btn-primary mx-auto justify-center text-sm inline-flex">Go to SecureVault</a>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden animate-slide-up" style={{ background: 'rgba(12,12,24,0.8)', border: '1px solid rgba(22,22,42,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            {/* Top accent */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, #5b5aff, #00c9a7)' }} />

            <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(22,22,42,0.6)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#5b5aff', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>Shared File</p>
              <h2 className="text-lg font-bold truncate" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em' }}>{fileData?.file?.name}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {[
                  { icon: HardDrive, label: 'Size', value: formatBytes(fileData?.file?.size) },
                  { icon: User, label: 'Shared by', value: fileData?.file?.owner?.name },
                  { icon: Clock, label: 'Uploaded', value: formatDate(fileData?.file?.createdAt) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(7,7,15,0.5)', border: '1px solid rgba(22,22,42,0.7)' }}>
                    <Icon size={14} style={{ color: '#444460', flexShrink: 0 }} />
                    <span className="text-sm flex-1" style={{ color: '#8888aa' }}>{label}</span>
                    <span className="text-sm font-medium" style={{ color: '#f0f0ff' }}>{value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(91,90,255,0.06)', border: '1px solid rgba(91,90,255,0.15)' }}>
                <Shield size={13} style={{ color: '#5b5aff' }} />
                <p className="text-xs" style={{ color: '#5b5aff' }}>Protected with AES-256 encryption</p>
              </div>

              <div className="space-y-2 pt-1">
                <button onClick={handleDownload} disabled={downloading} className="btn-primary w-full justify-center py-3">
                  {downloading ? <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                    : <><Download size={15} /> Download File</>}
                </button>
                <a href="/auth" className="btn-ghost w-full justify-center py-3 text-sm" style={{ display: 'flex', textDecoration: 'none' }}>
                  Sign in to SecureVault
                </a>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: '#444460' }}>
          © 2025 SecureVault · Military-grade file encryption
        </p>
      </div>
    </div>
  );
};

export default SharedFilePage;
