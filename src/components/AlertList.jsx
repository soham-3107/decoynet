import React, { useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronUp, ShieldAlert, Cpu } from 'lucide-react';

export default function AlertList({ alerts }) {
  const [expandedAlerts, setExpandedAlerts] = useState({});

  const toggleExpand = (id) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getSeverityClass = (score) => {
    if (score >= 90) return 'high';
    return 'medium';
  };

  const formatTime = (ts) => {
    return new Date(ts * 1000).toLocaleTimeString();
  };

  return (
    <div className="panel" style={{ flex: 1, minHeight: '400px' }}>
      <h2 className="section-title">
        <ShieldAlert size={16} /> Incidents & Threat Explanations
      </h2>
      <div className="alerts-container">
        {alerts.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '250px', 
            color: 'var(--text-muted)' 
          }}>
            <Cpu size={36} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <span style={{ fontSize: '0.85rem' }}>No anomalies detected. Scanning clean...</span>
          </div>
        ) : (
          [...alerts].reverse().map((alert) => (
            <div 
              key={alert.id} 
              className={`alert-card ${alert.severity_score >= 90 ? 'high-severity' : 'medium-severity'}`}
            >
              <div className="alert-header">
                <div className="alert-title-wrap">
                  <AlertOctagon size={16} style={{ color: alert.severity_score >= 90 ? 'var(--cyber-red)' : 'var(--cyber-orange)' }} />
                  <span className="alert-type-badge">{alert.threat_type.replace('_', ' ')}</span>
                  <span className={`severity-tag ${getSeverityClass(alert.severity_score)}`}>
                    CRIT: {alert.severity_score}
                  </span>
                </div>
                <span className="alert-timestamp">{formatTime(alert.timestamp)}</span>
              </div>

              <div className="alert-explainer">
                {alert.explainer}
              </div>

              <div className="alert-actions-panel">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className={`asset-badge ${alert.asset_info.risk_tier.toLowerCase().replace(' ', '-')}`}>
                    {alert.asset_info.name} ({alert.asset_info.risk_tier})
                  </span>
                  <span className="asset-badge" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    Action: {alert.action_status}
                  </span>
                </div>

                <button 
                  className="view-details-btn" 
                  onClick={() => toggleExpand(alert.id)}
                >
                  {expandedAlerts[alert.id] ? (
                    <>Hide Details <ChevronUp size={12} /></>
                  ) : (
                    <>Inspect Raw Logs <ChevronDown size={12} /></>
                  )}
                </button>
              </div>

              {expandedAlerts[alert.id] && (
                <div className="raw-details">
                  <pre>{JSON.stringify(alert.raw_event, null, 2)}</pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
