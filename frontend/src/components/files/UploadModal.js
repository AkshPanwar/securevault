import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, CheckCircle, AlertCircle, File, UploadCloud } from 'lucide-react';
import api from '../../utils/api';
import { formatBytes, getFileColor } from '../../utils/fileUtils';
import toast from 'react-hot-toast';
import ScanOverlay from './ScanOverlay';

// Map backend malwareScanStatus → ScanOverlay result
const toScanResult = (status) => {
  if (status === 'clean') return 'safe';
  if (status === 'suspicious') return 'medium';
  if (status === 'blocked') return 'blocked';
  return 'safe';
};

const UploadModal = ({ onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const [scanState, setScanState] = useState({
    visible: false,
    fileName: '',
    isScanning: true,
    progress: 0,
    result: null,
  });
  const pendingSuccessRef = React.useRef(false);

  const onDrop = useCallback((accepted, rejected) => {
    const newFiles = accepted.map((f) => ({ file: f, status: 'pending', progress: 0, error: null }));
    setFiles((prev) => [...prev, ...newFiles]);
    rejected.forEach(({ file, errors }) => toast.error(`${file.name}: ${errors[0]?.message}`));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxSize: 50 * 1024 * 1024, multiple: true,
  });

  const runScanAnimation = (fileName) =>
    new Promise((resolve) => {
      setScanState({ visible: true, fileName, isScanning: true, progress: 0, result: null });
      let pct = 0;
      const interval = setInterval(() => {
        pct += Math.random() * 12 + 3;
        if (pct >= 100) {
          pct = 100;
          clearInterval(interval);
          setScanState((prev) => ({ ...prev, progress: 100 }));
          setTimeout(() => resolve(), 400);
        } else {
          setScanState((prev) => ({ ...prev, progress: Math.round(pct) }));
        }
      }, 120);
    });

  const showScanResult = (riskResult) => {
    setScanState((prev) => ({ ...prev, isScanning: false, result: riskResult }));
  };

  const handleScanDismiss = () => {
    setScanState({ visible: false, fileName: '', isScanning: true, progress: 0, result: null });
    if (pendingSuccessRef.current) {
      pendingSuccessRef.current = false;
      onSuccess?.();
      setTimeout(onClose, 300);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    pendingFiles.forEach(({ file }) => formData.append('files', file));
    const displayName = pendingFiles.length === 1 ? pendingFiles[0].file.name : `${pendingFiles.length} files`;
    try {
      setFiles((prev) => prev.map((f) => f.status === 'pending' ? { ...f, status: 'uploading' } : f));
      const [uploadResult] = await Promise.all([
        api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            const pct = Math.round((evt.loaded * 100) / evt.total);
            setOverallProgress(pct);
            setFiles((prev) => prev.map((f) => f.status === 'uploading' ? { ...f, progress: pct } : f));
          },
        }),
        runScanAnimation(displayName),
      ]);
      setFiles((prev) => prev.map((f) => f.status === 'uploading' ? { ...f, status: 'done', progress: 100 } : f));
      const uploadedFiles = uploadResult.data?.data?.files || [];
      let worstStatus = 'clean';
      const order = { blocked: 3, suspicious: 2, clean: 1, pending: 0 };
      uploadedFiles.forEach((f) => {
        if ((order[f.malwareScanStatus] || 0) > (order[worstStatus] || 0)) worstStatus = f.malwareScanStatus;
      });
      const riskResult = toScanResult(worstStatus);
      showScanResult(riskResult);
      pendingSuccessRef.current = true;
      const label = riskResult === 'safe' ? '✓ Files clean — upload complete' : riskResult === 'medium' ? '⚠ Files uploaded with warnings' : '✕ Threat detected';
      toast[riskResult === 'blocked' ? 'error' : 'success'](label);
    } catch (err) {
      setFiles((prev) => prev.map((f) => f.status === 'uploading' ? { ...f, status: 'error', error: 'Upload failed' } : f));
      showScanResult('blocked');
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <>
      {scanState.visible && (
        <ScanOverlay
          fileName={scanState.fileName}
          isScanning={scanState.isScanning}
          progress={scanState.progress}
          result={scanState.result}
          onDismiss={handleScanDismiss}
        />
      )}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,3,8,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="w-full max-w-md rounded-2xl animate-scale-in" style={{ background: 'rgba(12,12,24,0.95)', border: '1px solid rgba(31,31,56,0.9)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', backdropFilter: 'blur(24px)' }}>
          <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(22,22,42,0.8)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91,90,255,0.1)', border: '1px solid rgba(91,90,255,0.2)' }}>
                <UploadCloud size={16} style={{ color: '#5b5aff' }} />
              </div>
              <div>
                <h2 className="font-semibold text-base" style={{ color: '#f0f0ff', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em' }}>Upload Files</h2>
                <p className="text-xs" style={{ color: '#8888aa' }}>Encrypted with AES-256 · Virus scan included</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888aa' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,22,42,0.6)'; e.currentTarget.style.color = '#f0f0ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#8888aa'; }}>
              <X size={16} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div {...getRootProps()} className="rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
              style={{ border: `2px dashed ${isDragActive ? 'rgba(91,90,255,0.6)' : 'rgba(31,31,56,0.8)'}`, background: isDragActive ? 'rgba(91,90,255,0.05)' : 'rgba(7,7,15,0.4)' }}>
              <input {...getInputProps()} />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(91,90,255,0.1)', border: '1px solid rgba(91,90,255,0.2)' }}>
                <Upload size={20} style={{ color: '#5b5aff' }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#f0f0ff' }}>{isDragActive ? 'Drop files here' : 'Drag & drop files here'}</p>
              <p className="text-xs" style={{ color: '#8888aa' }}>or <span style={{ color: '#5b5aff' }}>click to browse</span> · Max 50MB per file</p>
            </div>
            {files.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((f, i) => {
                  const color = getFileColor(f.file.type);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(7,7,15,0.6)', border: '1px solid rgba(22,22,42,0.7)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12` }}>
                        <File size={14} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: '#f0f0ff' }}>{f.file.name}</p>
                        <p className="text-xs" style={{ color: '#444460' }}>{formatBytes(f.file.size)}</p>
                        {f.status === 'uploading' && (
                          <div className="mt-1.5 w-full h-0.5 rounded-full" style={{ background: 'rgba(22,22,42,0.9)' }}>
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${f.progress}%`, background: 'linear-gradient(90deg, #5b5aff, #00c9a7)' }} />
                          </div>
                        )}
                      </div>
                      {f.status === 'done' && <CheckCircle size={14} style={{ color: '#00c9a7', flexShrink: 0 }} />}
                      {f.status === 'error' && <AlertCircle size={14} style={{ color: '#ff3860', flexShrink: 0 }} />}
                      {f.status === 'pending' && !uploading && (
                        <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888aa', flexShrink: 0, padding: 2 }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {uploading && (
              <div>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#8888aa' }}>
                  <span>Uploading & scanning...</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="w-full h-1 rounded-full" style={{ background: 'rgba(22,22,42,0.9)' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, #5b5aff, #00c9a7)' }} />
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || pendingCount === 0} className="btn-primary flex-1 justify-center">
                {uploading ? 'Scanning & Uploading...' : `Upload ${pendingCount > 0 ? pendingCount : ''} File${pendingCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UploadModal;
