import React, { useState, useEffect } from 'react';
import { Settings, Save, X, Plus, Trash, Database } from 'lucide-react';

export default function SystemSettings({ 
  isOpen, 
  onClose, 
  config, 
  onSaveConfig,
  auditLog 
}) {
  const [rules, setRules] = useState(null);
  const [assets, setAssets] = useState(null);

  useEffect(() => {
    if (config) {
      setRules(JSON.parse(JSON.stringify(config.rules)));
      setAssets(JSON.parse(JSON.stringify(config.assets)));
    }
  }, [config, isOpen]);

  if (!isOpen || !rules || !assets) return null;

  const handleRuleChange = (ruleKey, field, value) => {
    setRules(prev => ({
      ...prev,
      [ruleKey]: {
        ...prev[ruleKey],
        [field]: Number(value)
      }
    }));
  };

  const handleAssetTierChange = (assetId, newTier) => {
    setAssets(prev => prev.map(asset => {
      if (asset.id === assetId) {
        return { ...asset, risk_tier: newTier };
      }
      return asset;
    }));
  };

  const handleAddAsset = () => {
    const newAsset = {
      id: `asset-${Date.now().toString().slice(-6)}`,
      name: 'New Monitored Asset',
      target: '10.0.0.X',
      type: 'ip',
      risk_tier: 'Low-Risk',
      description: 'Custom added asset via dashboard UI settings panel'
    };
    setAssets(prev => [...prev, newAsset]);
  };

  const handleRemoveAsset = (id) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
  };

  const handleAssetFieldChange = (id, field, val) => {
    setAssets(prev => prev.map(asset => {
      if (asset.id === id) {
        return { ...asset, [field]: val };
      }
      return asset;
    }));
  };

  const handleSave = () => {
    onSaveConfig(rules, assets);
    onClose();
  };

  const formatTime = (ts) => {
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)', fontSize: '1.1rem' }}>
            <Settings size={18} /> System Settings & Asset Registry
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3 className="settings-section-title">Detection Rule Parameters</h3>
            
            <div className="settings-row">
              <div>
                <strong>Brute Force Max Attempts</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Failed logins permitted before triggering lock</div>
              </div>
              <input 
                type="number" 
                className="settings-input" 
                value={rules.brute_force.max_attempts}
                onChange={(e) => handleRuleChange('brute_force', 'max_attempts', e.target.value)}
              />
            </div>

            <div className="settings-row">
              <div>
                <strong>Brute Force Time Window (secs)</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tracking interval for brute force attempts</div>
              </div>
              <input 
                type="number" 
                className="settings-input" 
                value={rules.brute_force.window_seconds}
                onChange={(e) => handleRuleChange('brute_force', 'window_seconds', e.target.value)}
              />
            </div>

            <div className="settings-row">
              <div>
                <strong>Port Scan Distinct Port Threshold</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unique destination ports scanned before block</div>
              </div>
              <input 
                type="number" 
                className="settings-input" 
                value={rules.port_scan.max_ports}
                onChange={(e) => handleRuleChange('port_scan', 'max_ports', e.target.value)}
              />
            </div>

            <div className="settings-row">
              <div>
                <strong>Port Scan Window (secs)</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tracking interval for connection attempts</div>
              </div>
              <input 
                type="number" 
                className="settings-input" 
                value={rules.port_scan.window_seconds}
                onChange={(e) => handleRuleChange('port_scan', 'window_seconds', e.target.value)}
              />
            </div>

            <div className="settings-row">
              <div>
                <strong>Impossible Travel Speed Limit (km/h)</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speeds higher than this will trigger account lockdown</div>
              </div>
              <input 
                type="number" 
                className="settings-input" 
                value={rules.impossible_travel.max_speed_kmh}
                onChange={(e) => handleRuleChange('impossible_travel', 'max_speed_kmh', e.target.value)}
              />
            </div>
          </div>

          <div className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 className="settings-section-title" style={{ flex: 1 }}>Asset Risk Register</h3>
              <button className="btn-cyber" onClick={handleAddAsset} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                <Plus size={12} /> Add Asset
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {assets.map((asset) => (
                <div key={asset.id} className="asset-edit-row">
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={asset.name} 
                    onChange={(e) => handleAssetFieldChange(asset.id, 'name', e.target.value)}
                    placeholder="Asset Name"
                  />
                  <input 
                    type="text" 
                    className="settings-input" 
                    value={asset.target} 
                    onChange={(e) => handleAssetFieldChange(asset.id, 'target', e.target.value)}
                    placeholder="Target (IP / User)"
                  />
                  <select 
                    className="select-cyber"
                    value={asset.type}
                    onChange={(e) => handleAssetFieldChange(asset.id, 'type', e.target.value)}
                  >
                    <option value="ip">IP Address</option>
                    <option value="user">User Account</option>
                    <option value="ip_range">IP range</option>
                  </select>
                  
                  <select 
                    className="select-cyber"
                    value={asset.risk_tier}
                    onChange={(e) => handleAssetTierChange(asset.id, e.target.value)}
                    style={{ borderColor: asset.risk_tier === 'High-Risk' ? 'rgba(255, 7, 58, 0.4)' : 'rgba(0, 242, 254, 0.4)', color: asset.risk_tier === 'High-Risk' ? 'var(--cyber-red)' : 'var(--cyber-blue)' }}
                  >
                    <option value="Low-Risk">Low-Risk (Auto-Lock)</option>
                    <option value="High-Risk">High-Risk (Ask Consent)</option>
                  </select>
                  
                  <button 
                    onClick={() => handleRemoveAsset(asset.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--cyber-red)', cursor: 'pointer' }}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Database size={14} /> Security Actions Audit Trail
            </h3>
            <div className="audit-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Target</th>
                    <th>Risk Class</th>
                    <th>Action Requested</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Audit trail empty. No risk events processed yet.
                      </td>
                    </tr>
                  ) : (
                    auditLog.map((log) => (
                      <tr key={log.id}>
                        <td>{formatTime(log.timestamp)}</td>
                        <td style={{ fontWeight: 600 }}>{log.target}</td>
                        <td style={{ color: log.alert.asset_info.risk_tier === 'High-Risk' ? 'var(--cyber-red)' : 'var(--cyber-blue)' }}>
                          {log.alert.asset_info.risk_tier}
                        </td>
                        <td>{log.action}</td>
                        <td style={{ 
                          fontWeight: 'bold', 
                          color: log.status === 'approved' ? 'var(--cyber-green)' : (log.status === 'expired' ? 'var(--text-muted)' : 'var(--cyber-red)') 
                        }}>
                          {log.status.toUpperCase()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="dismiss-action-btn" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>
            Cancel
          </button>
          <button className="approve-action-btn" onClick={handleSave} style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Save size={14} /> Save Parameters
          </button>
        </div>
      </div>
    </div>
  );
}
