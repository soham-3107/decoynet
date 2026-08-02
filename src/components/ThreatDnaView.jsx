import React, { useState, useEffect } from 'react';
import { Dna, Calendar, ShieldAlert, ShieldCheck, Terminal, Tag, RefreshCw, Cpu, Activity, Server, AlertTriangle } from 'lucide-react';

export default function ThreatDnaView({ profiles }) {
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const profileList = Object.values(profiles || {});

  // Sum up all incidents and unique IPs
  const totalIncidents = profileList.reduce((acc, p) => acc + p.incidents.length, 0);
  const uniqueIps = new Set();
  profileList.forEach(p => p.ips_used.forEach(ip => uniqueIps.add(ip)));

  useEffect(() => {
    if (profileList.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profileList[0].id);
    }
  }, [profiles]);

  const activeProfile = profileList.find(p => p.id === selectedProfileId) || profileList[0];

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

  const getActorDescription = (name) => {
    if (name.includes('Volt-Typhoon')) {
      return "State-sponsored actor specializes in stealth reconnaissance and credential harvesting. Leverages customized proxy subnets and brute-force utilities to infiltrate core routing interfaces.";
    }
    if (name.includes('Cozy-Bear')) {
      return "Persistent threat actor associated with administrative escalation payloads. Focuses on directory configuration servers, executing targeted privilege commands via compromised session scopes.";
    }
    return "Adversary profile compiled dynamically from matching telemetry. Traced via automated behavioral fingerprint similarity matrix. Shows highly correlated timing and tooling patterns.";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, marginTop: '1.5rem' }}>
      
      {/* 1. FORENSIC INTEL METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        
        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--cyber-blue)' }}>
            <Dna size={20} style={{ animation: 'spin 12s infinite linear' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tracked Dossiers</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{profileList.length} Threats</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.08)', color: 'var(--cyber-red)' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Correlated Incidents</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{totalIncidents} Attacks</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(234, 88, 12, 0.08)', color: 'var(--cyber-orange)' }}>
            <Server size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active IP Pools</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{uniqueIps.size} Hosts</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--cyber-green)' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>DNA Match Accuracy</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--cyber-green)' }}>98.4% CONFIDENCE</div>
          </div>
        </div>

      </div>

      {/* 2. SPLIT INTERFACE */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', flex: 1 }}>
        
        {/* LEFT COLUMN: INTEL REGISTRY LIST */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Threat Actor Matrix
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '420px', flex: 1 }}>
            {profileList.map((prof) => {
              const isSelected = activeProfile?.id === prof.id;
              return (
                <div 
                  key={prof.id}
                  onClick={() => setSelectedProfileId(prof.id)}
                  style={{ 
                    background: isSelected ? '#f5f6ff' : '#ffffff', 
                    border: isSelected ? '1px solid var(--cyber-blue)' : '1px solid rgba(0, 0, 0, 0.05)', 
                    borderLeft: isSelected ? '4px solid var(--cyber-blue)' : '4px solid rgba(148, 163, 184, 0.4)',
                    borderRadius: '8px', 
                    padding: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.04)' : '0 2px 6px rgba(0,0,0,0.01)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? 'var(--cyber-blue)' : 'var(--text-primary)' }}>
                      {prof.name}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.62rem', background: '#ffe4e6', color: 'var(--cyber-red)', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      Seen: {prof.incidents.length}x
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Last Activity:</span>
                      <strong style={{ color: 'var(--text-secondary)' }}>{formatTimestamp(prof.last_seen).split(' ')[1]}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>IP Signatures:</span>
                      <strong style={{ color: 'var(--text-secondary)' }}>{prof.ips_used.length} logged</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: FINGERPRINT DOSSIER DISPLAY */}
        {activeProfile && (
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Dossier Header Info */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Dna size={22} style={{ color: 'var(--cyber-blue)', animation: 'spin 12s infinite linear' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Forensic Attributing Dossier: {activeProfile.name}
                  </h3>
                  <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: 'var(--cyber-green)', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <ShieldCheck size={10} /> Profile Compiled
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                  <span>Dossier Created: <strong>{formatTimestamp(activeProfile.first_seen)}</strong></span>
                  <span>•</span>
                  <span>Latest Signature Match: <strong>{formatTimestamp(activeProfile.last_seen)}</strong></span>
                </div>
              </div>
            </div>

            {/* Dossier Summary Explainer */}
            <div style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Cpu size={12} style={{ color: 'var(--cyber-blue)' }} /> Adversary Intelligence Assessment
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {getActorDescription(activeProfile.name)}
              </p>
            </div>

            {/* Dossier Traced Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              
              <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Traced Tooling</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {activeProfile.tool_signatures.join(', ')}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Timing Profile</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {activeProfile.timing_signatures.join(', ')}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Unique IP Pool</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {activeProfile.ips_used.length} source hosts
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Target Profile</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {activeProfile.targets_attempted.length} assets attempted
                </div>
              </div>

            </div>

            {/* Traced IPs and Target Subnets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginTop: '0.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Associated IP Addresses
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {activeProfile.ips_used.map((ip, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 600, 
                        color: 'var(--cyber-red)', 
                        border: '1px solid rgba(225, 29, 72, 0.12)', 
                        background: '#fff5f5', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '6px' 
                      }}
                    >
                      {ip}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Targeted Systems Matrix
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {activeProfile.targets_attempted.map((target, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 600, 
                        color: 'var(--cyber-blue)', 
                        border: '1px solid rgba(79, 70, 229, 0.12)', 
                        background: '#f5f6ff', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '6px' 
                      }}
                    >
                      {target}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Vertical Forensic Incident Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.25rem' }}>
                Dossier Incident Logs
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '180px', paddingRight: '0.25rem', position: 'relative', borderLeft: '2px solid rgba(0,0,0,0.04)', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                {activeProfile.incidents.slice().reverse().map((incident, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      position: 'relative',
                      background: '#ffffff', 
                      border: '1px solid rgba(0,0,0,0.04)', 
                      padding: '0.65rem 0.85rem', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.25rem' 
                    }}
                  >
                    {/* Timeline bullet dot */}
                    <span style={{ 
                      position: 'absolute', 
                      left: '-1.45rem', 
                      top: '0.85rem', 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: incident.attack_type === 'privilege_escalation' ? 'var(--cyber-red)' : 'var(--cyber-blue)', 
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 4px rgba(0,0,0,0.1)'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Source: {incident.ip} &gt; Targeted: {incident.target}
                      </span>
                      <span>{formatTimestamp(incident.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {incident.details}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
