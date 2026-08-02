import React, { useState, useEffect, useRef } from 'react';
import { Shield, Play, AlertTriangle, Radio } from 'lucide-react';

import DashboardHeader from './components/DashboardHeader';
import ThreatTicker from './components/ThreatTicker';
import AlertList from './components/AlertList';
import ApprovalGateway from './components/ApprovalGateway';
import LockdownRegistry from './components/LockdownRegistry';
import SlackSimulator from './components/SlackSimulator';
import SystemSettings from './components/SystemSettings';
import HoneypotFeed from './components/HoneypotFeed';
import ThreatDnaView from './components/ThreatDnaView';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [traffic, setTraffic] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [locks, setLocks] = useState({});
  const [approvals, setApprovals] = useState([]);
  const [allApprovals, setAllApprovals] = useState([]);
  const [config, setConfig] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [recentAlertActive, setRecentAlertActive] = useState(false);
  const [honeypots, setHoneypots] = useState({});
  const [honeypotFeed, setHoneypotFeed] = useState([]);
  const [threatProfiles, setThreatProfiles] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');

  const socketRef = useRef(null);

  const playAlertSound = (type = 'normal') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      if (type === 'high') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      }
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      console.log('Audio API blocked/unsupported:', e);
    }
  };

  useEffect(() => {
    connectWS();
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const connectWS = () => {
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to SOC backend WebSocket');
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const { type, data } = payload;

      switch (type) {
        case 'init':
          setConfig(data.config);
          setTraffic(data.traffic);
          setAlerts(data.alerts);
          setLocks(data.locks);
          setApprovals(data.approvals);
          setAllApprovals(data.all_approvals);
          setHoneypots(data.honeypots || {});
          setHoneypotFeed(data.honeypot_feed || []);
          setThreatProfiles(data.threat_profiles || {});
          break;

        case 'traffic':
          setTraffic(prev => [...prev, data].slice(-100));
          break;

        case 'alert':
          setAlerts(prev => [...prev, data]);
          setRecentAlertActive(true);
          playAlertSound(data.asset_info.risk_tier === 'High-Risk' ? 'high' : 'normal');
          setTimeout(() => setRecentAlertActive(false), 4000);
          break;

        case 'lock_update':
          setLocks(data.active ? { ...locks, [data.target]: { active: true, ...data } } : {});
          fetchLocks();
          break;

        case 'approval_update':
          fetchApprovals();
          break;

        case 'honeypot_update':
          setHoneypots(data.sessions || {});
          setHoneypotFeed(data.feed || []);
          break;

        case 'config_update':
          setConfig(data);
          break;

        case 'threat_dna_update':
          setThreatProfiles(data || {});
          break;

        case 'system_reset':
          setTraffic([]);
          setAlerts([]);
          setLocks({});
          setApprovals([]);
          setAllApprovals([]);
          setHoneypots({});
          setHoneypotFeed([]);
          setThreatProfiles({});
          break;

        default:
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from SOC backend. Reconnecting in 3s...');
      setTimeout(connectWS, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      ws.close();
    };
  };

  const fetchLocks = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locks`);
      const data = await res.json();
      setLocks(data);
    } catch (e) {
      console.error('Error fetching locks:', e);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/approvals`);
      const data = await res.json();
      setApprovals(data);

      const allRes = await fetch(`${BACKEND_URL}/api/approvals/all`);
      const allData = await allRes.json();
      setAllApprovals(allData);
    } catch (e) {
      console.error('Error fetching approvals:', e);
    }
  };

  const handleApprovalResponse = async (approvalId, status) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/approvals/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, status })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchApprovals();
      }
    } catch (e) {
      console.error('Error sending approval response:', e);
    }
  };

  const handleSlackClick = async (approvalId, action) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulate/slack-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, action })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchApprovals();
      }
    } catch (e) {
      console.error('Error simulating Slack click:', e);
    }
  };

  const handleUndoLockdown = async (target) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locks/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, reason: 'Manual Admin override unlock' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchLocks();
      }
    } catch (e) {
      console.error('Error removing lock:', e);
    }
  };

  const handleTriggerAttack = async (attackType, riskTier) => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      await fetch(`${BACKEND_URL}/api/simulate/attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_type: attackType, risk_tier: riskTier })
      });
      setTimeout(() => setIsSimulating(false), 800);
    } catch (e) {
      console.error('Error triggering attack:', e);
      setIsSimulating(false);
    }
  };

  const handleSaveConfig = async (rules, assets) => {
    try {
      await fetch(`${BACKEND_URL}/api/config/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      });

      await fetch(`${BACKEND_URL}/api/config/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets })
      });

      const res = await fetch(`${BACKEND_URL}/api/config`);
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error('Error saving configurations:', e);
    }
  };

  const handleResetSystem = async () => {
    if (window.confirm("Are you sure you want to reset all active lockdowns, alerts, and live ticker logs?")) {
      try {
        await fetch(`${BACKEND_URL}/api/config/reset`, { method: 'POST' });
      } catch (e) {
        console.error('Error resetting system logs:', e);
      }
    }
  };

  const activeApproval = approvals.find(req => req.status === 'pending');
  const redAlertActive = recentAlertActive || !!activeApproval;

  // Alternate browser tab title on red alert
  useEffect(() => {
    let interval = null;
    if (redAlertActive) {
      let toggle = false;
      interval = setInterval(() => {
        document.title = toggle ? '🚨 THREAT DETECTED 🚨' : 'DecoyNet';
        toggle = !toggle;
      }, 1000);
    } else {
      document.title = 'DecoyNet Response Center';
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [redAlertActive]);

  return (
    <div className={`app-container ${redAlertActive ? 'red-alert-active' : ''}`}>
      <div className="siren-overlay"></div>
      
      <DashboardHeader 
        isConnected={isConnected} 
        activeLocksCount={Object.keys(locks).length} 
        pendingApprovalsCount={approvals.filter(a => a.status === 'pending').length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        redAlertActive={redAlertActive}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {redAlertActive && (
        <div className="emergency-banner">
          <span>🚨 WARNING: AUTOMATED SEC RESPONSE ENGAGED - MITIGATION IN PROGRESS</span>
        </div>
      )}

      {activeTab === 'dashboard' ? (
        <div className="dashboard-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <ThreatTicker events={traffic} />
            <LockdownRegistry locks={locks} onUndoLock={handleUndoLockdown} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AlertList alerts={alerts} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="panel">
              <h2 className="section-title">
                <Play size={16} /> Scenario Simulator
              </h2>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Trigger mock threat scenarios to test automated responses.
              </div>

              <div className="demo-group">
                <div className="demo-group-title">Low-Risk Tier Scenarios (Auto-Lockdown)</div>
                <div className="demo-btn-grid">
                  <button 
                    className="sim-trigger-btn"
                    onClick={() => handleTriggerAttack('brute_force', 'Low-Risk')}
                    disabled={isSimulating}
                  >
                    <strong>Brute Force</strong>
                    <span className="target">Target: guest_temp</span>
                  </button>
                  <button 
                    className="sim-trigger-btn"
                    onClick={() => handleTriggerAttack('port_scan', 'Low-Risk')}
                    disabled={isSimulating}
                  >
                    <strong>Port Scan</strong>
                    <span className="target">Target: Staging VM</span>
                  </button>
                </div>
                <div className="demo-btn-grid" style={{ marginTop: '0.5rem' }}>
                  <button 
                    className="sim-trigger-btn"
                    onClick={() => handleTriggerAttack('impossible_travel', 'Low-Risk')}
                    disabled={isSimulating}
                    style={{ gridColumn: 'span 2' }}
                  >
                    <strong>Impossible Travel</strong>
                    <span className="target">Target: dev_user</span>
                  </button>
                </div>
              </div>

              <div className="demo-group" style={{ marginTop: '1.25rem' }}>
                <div className="demo-group-title" style={{ color: 'var(--cyber-red)' }}>High-Risk Tier Scenarios (Approval Gateway)</div>
                <div className="demo-btn-grid">
                  <button 
                    className="sim-trigger-btn high-risk"
                    onClick={() => handleTriggerAttack('brute_force', 'High-Risk')}
                    disabled={isSimulating}
                  >
                    <strong>Brute Force</strong>
                    <span className="target">Target: admin account</span>
                  </button>
                  <button 
                    className="sim-trigger-btn high-risk"
                    onClick={() => handleTriggerAttack('port_scan', 'High-Risk')}
                    disabled={isSimulating}
                  >
                    <strong>Port Scan</strong>
                    <span className="target">Target: Finance DB</span>
                  </button>
                </div>
                <div className="demo-btn-grid" style={{ marginTop: '0.5rem' }}>
                  <button 
                    className="sim-trigger-btn high-risk"
                    onClick={() => handleTriggerAttack('impossible_travel', 'High-Risk')}
                    disabled={isSimulating}
                  >
                    <strong>Impossible Travel</strong>
                    <span className="target">Target: finance_mgr</span>
                  </button>
                  <button 
                    className="sim-trigger-btn high-risk"
                    onClick={() => handleTriggerAttack('privilege_escalation', 'High-Risk')}
                    disabled={isSimulating}
                  >
                    <strong>Priv Escalation</strong>
                    <span className="target">Target: Active Directory</span>
                  </button>
                </div>
              </div>
            </div>

            <SlackSimulator 
              approvals={allApprovals} 
              onSlackClick={handleSlackClick} 
            />
          </div>
        </div>
      ) : activeTab === 'decoy' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <HoneypotFeed sessions={honeypots} feed={honeypotFeed} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <ThreatDnaView profiles={threatProfiles} />
        </div>
      )}

      <ApprovalGateway 
        activeApproval={activeApproval} 
        onRespond={handleApprovalResponse} 
      />

      <SystemSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config} 
        onSaveConfig={handleSaveConfig}
        auditLog={allApprovals}
      />
    </div>
  );
}
