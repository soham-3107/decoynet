import React from 'react';
import { Send, Users } from 'lucide-react';

export default function SlackSimulator({ approvals, onSlackClick }) {
  const getSlackClass = (status) => {
    if (status === 'approved') return '#2eb67d';
    if (status === 'rejected') return '#ff073a';
    return '#e01e5a';
  };

  const handleAction = async (approvalId, action) => {
    await onSlackClick(approvalId, action);
  };

  return (
    <div className="panel">
      <h2 className="section-title" style={{ color: '#e01e5a', marginBottom: '0.75rem' }}>
        <Users size={16} /> Slack Alerts Hook Feed
      </h2>

      <div className="slack-simulator">
        <div className="slack-header">
          <span className="slack-logo">💬</span>
          <span>#security-approvals</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#8b8e94' }}>2 Members</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '180px', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {approvals.length === 0 ? (
            <div className="slack-empty">
              No webhook posts in #security-approvals.<br/>
              Awaiting a High-Risk asset event.
            </div>
          ) : (
            [...approvals].reverse().map((req) => (
              <div key={req.id} className="slack-msg">
                <div className="slack-avatar">SOC</div>
                <div className="slack-msg-body">
                  <div className="slack-sender">
                    Autonomous Response Agent <span style={{ fontSize: '0.65rem', color: '#8b8e94', fontWeight: 'normal' }}>APP • Just Now</span>
                  </div>
                  
                  {req.status !== 'pending' ? (
                    <div className="slack-card" style={{ borderLeftColor: getSlackClass(req.status), background: '#f8fafc' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: req.status === 'approved' ? '#2eb67d' : '#e01e5a' }}>
                        {req.status === 'approved' ? '✅ Lockdown Approved via Slack' : '❌ Alert Dismissed'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Asset: <strong>{req.alert.asset_info.name}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                        "{req.alert.explainer}"
                      </div>
                    </div>
                  ) : (
                    <div className="slack-card">
                      <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#e01e5a' }}>
                        🚨 HIGH-RISK SECURITY APPROVAL REQUIRED
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', display: 'flex', gap: '0.5rem', color: '#64748b' }}>
                        <span>Asset: <strong>{req.alert.asset_info.name}</strong></span>
                        <span>|</span>
                        <span>Tier: <strong style={{ color: 'var(--cyber-red)' }}>{req.alert.asset_info.risk_tier}</strong></span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#334155', margin: '0.25rem 0' }}>
                        {req.alert.explainer}
                      </div>

                      <div className="slack-btn-row">
                        <button 
                          className="slack-btn approve"
                          onClick={() => handleAction(req.id, 'approve')}
                        >
                          Approve Lockdown
                        </button>
                        <button 
                          className="slack-btn dismiss"
                          onClick={() => handleAction(req.id, 'dismiss')}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
