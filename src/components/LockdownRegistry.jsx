import React from 'react';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';

export default function LockdownRegistry({ locks, onUndoLock }) {
  const activeLockKeys = Object.keys(locks);

  return (
    <div className="panel" style={{ height: '350px' }}>
      <h2 className="section-title">
        <Lock size={16} style={{ color: 'var(--cyber-red)' }} /> Active Lockdown Blocks
      </h2>
      
      <div className="lockdown-list">
        {activeLockKeys.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px', 
            color: 'var(--text-muted)' 
          }}>
            <Unlock size={32} style={{ marginBottom: '0.75rem', opacity: 0.2 }} />
            <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>No active block rules.<br/>System unrestricted.</span>
          </div>
        ) : (
          activeLockKeys.map((key) => {
            const lock = locks[key];
            return (
              <div key={key} className="lockdown-card">
                <div className="lockdown-info">
                  <div className="lockdown-target">
                    {key}
                  </div>
                  <div className="lockdown-details">
                    Type: <span style={{ textTransform: 'uppercase', color: 'var(--cyber-blue)' }}>{lock.type}</span>
                  </div>
                  <div className="lockdown-details" style={{ wordBreak: 'break-word', color: 'var(--text-muted)' }}>
                    Reason: {lock.reason.replace(/Automated defense triggered by rule '.*?': /, '')}
                  </div>
                </div>

                <button 
                  className="undo-btn"
                  onClick={() => onUndoLock(key)}
                  title="Remove lockdown block"
                >
                  <Unlock size={12} />
                  Restore
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
