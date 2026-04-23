import React, { useEffect, useRef } from 'react';
import { Files, HardDrive, Share2, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../../utils/fileUtils';

const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onEnter = () => {
      el.style.transform = 'translateY(-3px)';
      el.style.boxShadow = `0 12px 40px ${color}18, 0 0 0 1px ${color}22`;
      el.style.borderColor = `${color}30`;
    };
    const onLeave = () => {
      el.style.transform = '';
      el.style.boxShadow = '';
      el.style.borderColor = 'rgba(22,22,42,0.8)';
    };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave); };
  }, [color]);

  return (
    <div ref={cardRef} className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background:'rgba(12,12,24,0.7)', border:'1px solid rgba(22,22,42,0.8)', backdropFilter:'blur(20px)', animationDelay:`${delay}ms`, transition:'transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, border-color 0.25s ease', cursor:'default' }}>
      {/* ambient glow */}
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:color, opacity:0.07, filter:'blur(20px)', pointerEvents:'none' }} />
      {/* top accent line */}
      <div style={{ position:'absolute', top:0, left:'20%', right:'20%', height:1, background:`linear-gradient(90deg,transparent,${color}40,transparent)` }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color:'#8888aa' }}>{label}</p>
          <p className="text-xl font-bold" style={{ color:'#f0f0ff', fontFamily:'Syne, sans-serif', letterSpacing:'-0.02em' }}>{value}</p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${color}15`, border:`1px solid ${color}25` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </div>
  );
};

const StatsCards = ({ stats }) => {
  if (!stats) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );

  const storagePercent = stats.storageLimit ? Math.min((stats.storageUsed / stats.storageLimit) * 100, 100).toFixed(0) : 0;

  const cards = [
    { icon:Files,      label:'Total Files',    value:stats.totalFiles ?? 0,            color:'#5b5aff' },
    { icon:HardDrive,  label:'Storage Used',   value:`${formatBytes(stats.storageUsed)} (${storagePercent}%)`, color:'#00c9a7' },
    { icon:Share2,     label:'Shared Files',   value:stats.sharedFiles ?? 0,           color:'#b06aff' },
    { icon:ShieldCheck,label:'Encrypted',      value:stats.totalFiles ?? 0,            color:'#00e5a0' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => <StatCard key={i} {...card} delay={i * 60} />)}
    </div>
  );
};

export default StatsCards;
