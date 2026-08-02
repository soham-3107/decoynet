import React, { useEffect, useRef } from 'react';
import { Eye, Radio, Database, FileText, MonitorPlay, LogIn, Activity, ShieldAlert, Cpu, Server } from 'lucide-react';

export default function HoneypotFeed({ sessions, feed }) {
  const containerRef = useRef(null);
  const sessionList = Object.values(sessions);
  const activeSessions = sessionList.filter(s => s.status === 'active');
  const completedSessions = sessionList.filter(s => s.status === 'completed');

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [feed]);

  const getDecoyLabel = (type) => {
    switch (type) {
      case 'fake_database': return 'Decoy SQL Portal';
      case 'fake_file_share': return 'Decoy FTP Vault';
      case 'fake_login': return 'Decoy Admin Page';
      case 'fake_session_shell': return 'Decoy SSH Shell';
      default: return 'Decoy Workspace';
    }
  };

  const getActionColor = (details) => {
    const text = details.toLowerCase();
    if (text.includes('exfiltrat') || text.includes('download')) return '#f97316'; // Exfiltration - Orange
    if (text.includes('violation') || text.includes('traversal')) return '#f43f5e'; // Attack Action - Rose/Red
    if (text.includes('query') || text.includes('command') || text.includes('select')) return '#eab308'; // Interaction - Yellow
    if (text.includes('success') || text.includes('established')) return '#22c55e'; // Success/Connected - Green
    return '#38bdf8'; // Info/System - Cyan
  };

  const getEnvironmentBadge = (type) => {
    switch (type) {
      case 'fake_database':
        return <span style={{ color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.05)', fontSize: '0.62rem', fontWeight: 600 }}>SQL</span>;
      case 'fake_file_share':
        return <span style={{ color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(192, 132, 252, 0.05)', fontSize: '0.62rem', fontWeight: 600 }}>FTP</span>;
      case 'fake_login':
        return <span style={{ color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.05)', fontSize: '0.62rem', fontWeight: 600 }}>HTTP</span>;
      case 'fake_session_shell':
        return <span style={{ color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.05)', fontSize: '0.62rem', fontWeight: 600 }}>SSH</span>;
      default:
        return <span style={{ color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(148, 163, 184, 0.05)', fontSize: '0.62rem', fontWeight: 600 }}>SYS</span>;
    }
  };

  const formatTimestamp = (ts) => {
    const d = new Date(ts * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, marginTop: '1.5rem' }}>
      
      {/* 1. KEY METRICS COUNTERS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        
        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--cyber-blue)' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Telemetry Status</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cyber-green)' }}>ACTIVE MONITORING</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(225, 29, 72, 0.08)', color: 'var(--cyber-red)' }}>
            <Radio size={20} className={activeSessions.length > 0 ? "status-dot offline" : ""} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Decoys Active</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{activeSessions.length} Deployments</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(234, 88, 12, 0.08)', color: 'var(--cyber-orange)' }}>
            <Database size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Commands Logged</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{feed.length} Operations</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--cyber-green)' }}>
            <Server size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Decoy Sandbox Health</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cyber-green)' }}>100.0% ISOLATED</div>
          </div>
        </div>

      </div>

      {/* 2. MAIN SPLIT INTERFACE */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', flex: 1 }}>
        
        {/* LEFT COLUMN: ACTIVE DECOY REGISTRY */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Cpu size={14} style={{ color: 'var(--cyber-blue)' }} /> Redirection Registry
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '420px' }}>
            {sessionList.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '2rem 1rem' }}>
                Honeypot sandbox idle. Redirected sessions will log here automatically.
              </div>
            ) : (
              [...sessionList].reverse().map((session) => (
                <div 
                  key={session.id} 
                  style={{ 
                    background: '#ffffff', 
                    border: session.status === 'active' ? '1px solid rgba(225, 29, 72, 0.18)' : '1px solid rgba(0, 0, 0, 0.04)', 
                    borderRadius: '10px', 
                    padding: '0.85rem',
                    boxShadow: session.status === 'active' ? '0 4px 12px rgba(225, 29, 72, 0.03)' : '0 2px 6px rgba(0,0,0,0.01)',
                    transition: 'var(--transition-normal)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: session.status === 'active' ? 'var(--cyber-red)' : 'var(--text-muted)' }}>
                      {session.attacker}
                    </span>
                    <span style={{ marginLeft: 'auto' }}>
                      {getEnvironmentBadge(session.decoy_type)}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div>Decoy Type: <strong style={{ color: 'var(--text-secondary)' }}>{getDecoyLabel(session.decoy_type)}</strong></div>
                    <div>Targeted Asset: <span style={{ color: 'var(--text-secondary)' }}>{session.asset}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem', color: session.status === 'active' ? 'var(--cyber-green)' : 'var(--text-muted)', fontWeight: 600 }}>
                      <span className={`status-dot ${session.status === 'active' ? 'online' : 'offline'}`} style={{ width: '6px', height: '6px' }}></span>
                      {session.status === 'active' ? 'Active Infiltration' : 'Telemetry Log Closed'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PROFESSIONAL INTELLIGENCE TERMINAL */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.15)' }}>
          
          {/* Linux window top bar */}
          <div style={{ background: '#1e293b', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            </div>
            <div style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>root@aegis-sentinel-soc-decoy:~#</span>
              <span style={{ color: '#f8fafc' }}>tail -f /var/log/decoy/telemetry.log</span>
            </div>
          </div>

          {/* Terminal log panel */}
          <div 
            className="ticker-container" 
            ref={containerRef} 
            style={{ 
              height: '420px', 
              maxHeight: '420px',
              background: '#020617', // Deep slate black
              color: '#f8fafc', // Clean white
              border: 'none', 
              borderRadius: 0, 
              padding: '0.75rem',
              fontFamily: 'var(--font-mono)',
              overflowY: 'auto'
            }}
          >
            {feed.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center', marginTop: '7.5rem', fontStyle: 'italic' }}>
                Honeypot sandbox standby. Silent decoy redirection armed; awaiting telemetry triggers...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>TIMESTAMP</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>ATTACKER IP</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>ENVIRONMENT</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>DECOY ACTION TELEMETRY</th>
                  </tr>
                </thead>
                <tbody>
                  {feed.map((item, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.03)', 
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' 
                      }}
                    >
                      <td style={{ padding: '0.55rem 0.5rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(item.timestamp)}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#f43f5e', fontWeight: 600 }}>
                        {item.attacker}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
                        [{item.decoy_type.replace('fake_', '')}]
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: getActionColor(item.details), fontWeight: 500 }}>
                        {item.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
