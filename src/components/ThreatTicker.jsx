import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export default function ThreatTicker({ events }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  const getEventClass = (event) => {
    if (event.severity === 'high' || event.event_type === 'lockdown_applied') {
      return 'severity-high';
    }
    if (event.severity === 'warning' || event.status === 'failed') {
      return 'severity-warning';
    }
    return '';
  };

  const formatTimestamp = (ts) => {
    const d = new Date(ts * 1000);
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  return (
    <div className="panel" style={{ height: '350px' }}>
      <h2 className="section-title">
        <Terminal size={16} /> Live Ingestion Feed
      </h2>
      <div className="ticker-container" ref={containerRef}>
        {events.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '2rem' }}>
            Awaiting security event streams...
          </div>
        ) : (
          events.map((evt, idx) => (
            <div key={idx} className={`ticker-item ${getEventClass(evt)}`}>
              <div className="ticker-meta">
                <span className="ticker-type">{evt.event_type}</span>
                <span className="ticker-timestamp">{formatTimestamp(evt.timestamp)}</span>
              </div>
              <div className="ticker-details">
                {evt.source_ip && (
                  <span className="ticker-ip">{evt.source_ip} &gt; </span>
                )}
                {evt.details || (evt.event_type === 'login_attempt' 
                  ? `Login attempt for user '${evt.user}' (${evt.status})` 
                  : evt.event_type === 'db_query' 
                  ? `Query executed on ${evt.database}`
                  : `IP traffic: ${evt.method || 'CONNECT'} ${evt.path || evt.destination_port || ''}`)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
