import React from 'react';
import { Shield, Settings, RotateCcw, AlertTriangle, Eye, Dna } from 'lucide-react';

export default function DashboardHeader({ 
  isConnected, 
  activeLocksCount, 
  pendingApprovalsCount, 
  onOpenSettings,
  redAlertActive,
  activeTab,
  onChangeTab
}) {
  return (
    <header className="header">
      <div className="brand-section">
        <Shield className="brand-icon" size={28} />
        <div>
          <h1 className="brand-title">DecoyNet</h1>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.2px', fontWeight: 500 }}>
            Automated Threat Response
          </div>
        </div>
      </div>

      {/* Page Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.25rem', 
        background: 'rgba(0, 0, 0, 0.03)', 
        padding: '0.25rem', 
        borderRadius: '8px', 
        border: '1px solid rgba(0, 0, 0, 0.05)' 
      }}>
        <button 
          onClick={() => onChangeTab('dashboard')} 
          style={{ 
            background: activeTab === 'dashboard' ? 'var(--bg-secondary)' : 'none', 
            border: 'none', 
            borderRadius: '6px', 
            padding: '0.45rem 0.9rem', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: activeTab === 'dashboard' ? 'var(--cyber-blue)' : 'var(--text-muted)', 
            cursor: 'pointer',
            boxShadow: activeTab === 'dashboard' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <Shield size={13} /> Response Center
        </button>
        <button 
          onClick={() => onChangeTab('decoy')} 
          style={{ 
            background: activeTab === 'decoy' ? 'var(--bg-secondary)' : 'none', 
            border: 'none', 
            borderRadius: '6px', 
            padding: '0.45rem 0.9rem', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: activeTab === 'decoy' ? 'var(--cyber-blue)' : 'var(--text-muted)', 
            cursor: 'pointer',
            boxShadow: activeTab === 'decoy' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <Eye size={13} /> Decoy Intelligence
        </button>
        <button 
          onClick={() => onChangeTab('threat_dna')} 
          style={{ 
            background: activeTab === 'threat_dna' ? 'var(--bg-secondary)' : 'none', 
            border: 'none', 
            borderRadius: '6px', 
            padding: '0.45rem 0.9rem', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: activeTab === 'threat_dna' ? 'var(--cyber-blue)' : 'var(--text-muted)', 
            cursor: 'pointer',
            boxShadow: activeTab === 'threat_dna' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <Dna size={13} /> Threat DNA
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {redAlertActive && (
          <div className="status-pill" style={{ borderColor: 'var(--cyber-red)', background: '#ffe4e6', color: 'var(--cyber-red)' }}>
            <AlertTriangle size={13} className="status-dot offline" />
            <span style={{ fontWeight: 700 }}>Red Alert Active</span>
          </div>
        )}

        <div className="status-pill">
          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`}></div>
          <span>System: {isConnected ? 'Online' : 'Offline'}</span>
        </div>

        <div className="status-pill">
          <span>Active Blocks:</span>
          <span style={{ color: 'var(--cyber-red)', fontWeight: 700 }}>{activeLocksCount}</span>
        </div>

        <div className="status-pill">
          <span>Pending Actions:</span>
          <span style={{ color: 'var(--cyber-yellow)', fontWeight: 700 }}>{pendingApprovalsCount}</span>
        </div>

        <button className="btn-cyber-outline" onClick={onOpenSettings} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Settings size={13} />
          Settings
        </button>
      </div>
    </header>
  );
}
