import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, ShieldAlert, XCircle, CheckCircle } from 'lucide-react';

export default function ApprovalGateway({ activeApproval, onRespond }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!activeApproval) return;

    const expiry = activeApproval.expires_at;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.round(expiry - (Date.now() / 1000)));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerInterval);
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 500);

    const playAlarm = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } catch (e) {
        console.log("Audio alert blocked/unsupported:", e);
      }
    };

    playAlarm();
    const alarmInterval = setInterval(playAlarm, 2500);

    return () => {
      clearInterval(timerInterval);
      clearInterval(alarmInterval);
    };
  }, [activeApproval]);

  if (!activeApproval) return null;

  const handleAction = async (status) => {
    setIsSubmitting(true);
    await onRespond(activeApproval.id, status);
    setIsSubmitting(false);
  };

  const percentage = Math.max(0, Math.min(100, (timeLeft / 60) * 100));

  return (
    <div className="overlay-container">
      <div className="approval-modal">
        <div className="modal-header">
          <AlertTriangle size={24} className="status-dot offline" />
          <h2>High-Risk Approval Required</h2>
        </div>

        <div className="modal-explainer">
          <strong>Incident Summary:</strong>
          <p style={{ marginTop: '0.5rem', color: '#0f172a', fontWeight: 550 }}>
            {activeApproval.alert.explainer}
          </p>
        </div>

        <div className="modal-meta-grid">
          <div className="meta-item">
            <div className="meta-label">Monitored Target</div>
            <div className="meta-val">{activeApproval.target} ({activeApproval.target_type.toUpperCase()})</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Asset Classification</div>
            <div className="meta-val high-risk" style={{ color: 'var(--cyber-red)' }}>HIGH-RISK TIER</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Lockdown Action</div>
            <div className="meta-val" style={{ color: 'var(--cyber-orange)', fontWeight: 'bold' }}>
              {activeApproval.action}
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Triggering Event</div>
            <div className="meta-val" style={{ textTransform: 'capitalize' }}>
              {activeApproval.alert.threat_type.replace('_', ' ')}
            </div>
          </div>
        </div>

        <div className="countdown-container">
          <div className="countdown-bar-outer">
            <div 
              className="countdown-bar-inner" 
              style={{ width: `${percentage}%`, transition: timeLeft === 60 ? 'none' : 'width 0.5s linear' }}
            ></div>
          </div>
          <div className="countdown-text">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={12} /> Pending Approval Gateway Timeout
            </span>
            <span style={{ fontFamily: 'var(--font-title)', fontWeight: 'bold', color: timeLeft < 15 ? 'var(--cyber-red)' : 'var(--text-primary)' }}>
              {timeLeft} SECONDS REMAINING
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="approve-action-btn"
            onClick={() => handleAction('approved')}
            disabled={isSubmitting || timeLeft <= 0}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <CheckCircle size={18} />
            {isSubmitting ? 'Processing...' : 'Approve Lockdown'}
          </button>
          
          <button 
            className="dismiss-action-btn"
            onClick={() => handleAction('rejected')}
            disabled={isSubmitting || timeLeft <= 0}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <XCircle size={18} />
            Dismiss Alert
          </button>
        </div>
      </div>
    </div>
  );
}
