import os
import json
import time
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db.json")

class SecurityDB:
    def __init__(self):
        self.db = {
            "traffic": [],      # Raw log stream events
            "alerts": [],       # Threat detection alerts
            "locks": {},        # Active lockdowns: { target: { type, timestamp, reason, rule, active } }
            "approvals": {},    # Pending approvals: { approval_id: { id, alert, timestamp, expires_at, status, action } }
            "honeypots": {},    # Active honeypot decoy sessions
            "honeypot_feed": [], # Attacker action stream timeline
            "threat_profiles": {} # Persistent attacker fingerprint profiles
        }
        self.load()

    def load(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r") as f:
                    self.db = json.load(f)
                    # Ensure all keys exist
                    for key in ["traffic", "alerts", "locks", "approvals", "honeypots", "honeypot_feed", "threat_profiles"]:
                        if key not in self.db:
                            self.db[key] = [] if key in ["traffic", "alerts", "honeypot_feed"] else {}
                    if not self.db.get("threat_profiles"):
                        self.db["threat_profiles"] = self.generate_default_profiles()
            except Exception as e:
                print(f"Error loading DB: {e}. Starting fresh.")
                self.save()
        else:
            self.db["threat_profiles"] = self.generate_default_profiles()
            self.save()

    def save(self):
        try:
            with open(DB_FILE, "w") as f:
                json.dump(self.db, f, indent=2)
        except Exception as e:
            print(f"Error saving DB: {e}")

    def add_traffic(self, event: Dict[str, Any]):
        # Keep traffic log limited to last 500 events
        self.db["traffic"].append(event)
        if len(self.db["traffic"]) > 500:
            self.db["traffic"].pop(0)
        self.save()

    def get_traffic(self) -> List[Dict[str, Any]]:
        return self.db["traffic"]

    def add_alert(self, alert: Dict[str, Any]):
        self.db["alerts"].append(alert)
        if len(self.db["alerts"]) > 100:
            self.db["alerts"].pop(0)
        self.save()

    def get_alerts(self) -> List[Dict[str, Any]]:
        return self.db["alerts"]

    def get_locks(self) -> Dict[str, Any]:
        # Filter for only active locks
        return {k: v for k, v in self.db["locks"].items() if v.get("active", True)}

    def get_lock_history(self) -> List[Dict[str, Any]]:
        history = []
        for target, data in self.db["locks"].items():
            history.append({
                "target": target,
                **data
            })
        # Sort by timestamp desc
        return sorted(history, key=lambda x: x.get("timestamp", 0), reverse=True)

    def add_lock(self, target: str, lock_type: str, reason: str, rule: str):
        self.db["locks"][target] = {
            "type": lock_type,
            "timestamp": time.time(),
            "reason": reason,
            "rule": rule,
            "active": True
        }
        # Add to traffic log
        self.add_traffic({
            "timestamp": time.time(),
            "source_ip": "127.0.0.1",
            "event_type": "lockdown_applied",
            "details": f"Locked down target: {target} ({lock_type}) due to rule '{rule}'",
            "severity": "high"
        })
        self.save()

    def remove_lock(self, target: str, reason: str = "Manual Admin Action"):
        if target in self.db["locks"]:
            self.db["locks"][target]["active"] = False
            self.db["locks"][target]["unlocked_at"] = time.time()
            self.db["locks"][target]["unlock_reason"] = reason
            
            # Add to traffic log
            self.add_traffic({
                "timestamp": time.time(),
                "source_ip": "127.0.0.1",
                "event_type": "lockdown_removed",
                "details": f"Unlocked target: {target}. Reason: {reason}",
                "severity": "info"
            })
            self.save()
            return True
        return False

    def is_locked(self, target: str) -> bool:
        lock = self.db["locks"].get(target)
        return lock is not None and lock.get("active", False)

    def add_approval_request(self, approval_id: str, alert: Dict[str, Any], timeout_seconds: int = 60) -> Dict[str, Any]:
        now = time.time()
        req = {
            "id": approval_id,
            "alert": alert,
            "timestamp": now,
            "expires_at": now + timeout_seconds,
            "status": "pending",
            "target": alert["target"],
            "target_type": alert["target_type"],
            "lock_type": alert["suggested_lock_type"],
            "action": alert["suggested_action"],
            "slack_ts": None
        }
        self.db["approvals"][approval_id] = req
        self.save()
        return req

    def get_approval_request(self, approval_id: str) -> Optional[Dict[str, Any]]:
        # Auto-expire if pending and past expiration time
        req = self.db["approvals"].get(approval_id)
        if req and req["status"] == "pending" and time.time() > req["expires_at"]:
            self.update_approval_status(approval_id, "expired")
            return self.db["approvals"][approval_id]
        return req

    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        pending = []
        now = time.time()
        for app_id, req in list(self.db["approvals"].items()):
            if req["status"] == "pending":
                if now > req["expires_at"]:
                    self.update_approval_status(app_id, "expired")
                else:
                    pending.append(req)
        return pending

    def update_approval_status(self, approval_id: str, status: str, slack_ts: Optional[str] = None) -> bool:
        if approval_id in self.db["approvals"]:
            req = self.db["approvals"][approval_id]
            
            # Prevent updating terminal states
            if req["status"] in ["approved", "rejected", "expired"] and status != "pending":
                return False
                
            req["status"] = status
            if slack_ts:
                req["slack_ts"] = slack_ts
                
            # Log transition to traffic
            self.add_traffic({
                "timestamp": time.time(),
                "source_ip": "127.0.0.1",
                "event_type": f"approval_{status}",
                "details": f"Approval request {approval_id} for {req['target']} status changed to {status.upper()}",
                "severity": "info" if status == "pending" else ("high" if status == "approved" else "warning")
            })
            self.save()
            return True
        return False

    def get_all_approvals(self) -> List[Dict[str, Any]]:
        # Refresh expiries
        self.get_pending_approvals()
        return sorted(list(self.db["approvals"].values()), key=lambda x: x.get("timestamp", 0), reverse=True)

    def add_honeypot_session(self, session_id: str, attacker: str, asset: str, decoy_type: str):
        self.db["honeypots"][session_id] = {
            "id": session_id,
            "attacker": attacker,
            "asset": asset,
            "decoy_type": decoy_type,
            "status": "active",
            "start_time": time.time(),
            "activity": []
        }
        # Log to general traffic as well
        self.add_traffic({
            "timestamp": time.time(),
            "source_ip": "127.0.0.1",
            "event_type": "honeypot_deployed",
            "details": f"silently redirected attacker {attacker} to decoy {decoy_type} matching {asset}",
            "severity": "warning"
        })
        self.save()

    def add_honeypot_activity(self, session_id: str, action: str, details: str, status: str = "success"):
        if session_id in self.db["honeypots"]:
            timestamp = time.time()
            evt = {
                "timestamp": timestamp,
                "action": action,
                "details": details,
                "status": status
            }
            # Append to session's own list
            self.db["honeypots"][session_id]["activity"].append(evt)
            
            # Append to global honeypot feed (flattened)
            self.db["honeypot_feed"].append({
                "session_id": session_id,
                "attacker": self.db["honeypots"][session_id]["attacker"],
                "decoy_type": self.db["honeypots"][session_id]["decoy_type"],
                **evt
            })
            
            # Cap the global feed size
            if len(self.db["honeypot_feed"]) > 100:
                self.db["honeypot_feed"].pop(0)
                
            self.save()
            return True
        return False

    def complete_honeypot_session(self, session_id: str):
        if session_id in self.db["honeypots"]:
            self.db["honeypots"][session_id]["status"] = "completed"
            self.add_honeypot_activity(
                session_id=session_id,
                action="session_terminated",
                details="Attacker decoy session closed due to command-and-control timeout."
            )
            self.save()
            return True
        return False

    def get_honeypot_sessions(self) -> Dict[str, Any]:
        return self.db.get("honeypots", {})

    def get_honeypot_feed(self) -> List[Dict[str, Any]]:
        return self.db.get("honeypot_feed", [])

    def get_threat_profiles(self) -> Dict[str, Any]:
        return self.db.get("threat_profiles", {})

    def generate_default_profiles(self) -> Dict[str, Any]:
        now = time.time()
        return {
            "profile-volt-typhoon": {
                "id": "profile-volt-typhoon",
                "name": "APT-Volt-Typhoon-91",
                "attack_types": ["port_scan", "brute_force"],
                "tool_signatures": ["Nmap/7.92", "Hydra/9.2"],
                "timing_signatures": ["Burst Scan (High-Frequency)"],
                "targets_attempted": ["10.0.0.5", "10.0.0.20"],
                "ips_used": ["185.220.101.44", "45.143.203.11"],
                "first_seen": now - 86400 * 3,
                "last_seen": now - 3600 * 4,
                "incidents": [
                    {
                        "timestamp": now - 86400 * 3,
                        "ip": "185.220.101.44",
                        "target": "10.0.0.5",
                        "attack_type": "port_scan",
                        "details": "Port Scan Audit: Sequential reconnaissance scan executed against Active Directory Controller."
                    },
                    {
                        "timestamp": now - 86400 * 2,
                        "ip": "45.143.203.11",
                        "target": "10.0.0.20",
                        "attack_type": "brute_force",
                        "details": "SQL Audit: Failed connection attempts detected; suspected directory password dictionary attack."
                    }
                ]
            },
            "profile-cozy-bear": {
                "id": "profile-cozy-bear",
                "name": "APT-Cozy-Bear-33",
                "attack_types": ["privilege_escalation"],
                "tool_signatures": ["Metasploit-Framework (m_privesc)"],
                "timing_signatures": ["Targeted Command"],
                "targets_attempted": ["admin"],
                "ips_used": ["91.242.162.8"],
                "first_seen": now - 86400 * 5,
                "last_seen": now - 3600 * 12,
                "incidents": [
                    {
                        "timestamp": now - 86400 * 5,
                        "ip": "91.242.162.8",
                        "target": "admin",
                        "attack_type": "privilege_escalation",
                        "details": "Shell Audit: Interactive privilege escalation attempt executed on root account context."
                    }
                ]
            }
        }

    def add_threat_profile(self, profile_id: str, profile_data: Dict[str, Any]):
        self.db["threat_profiles"][profile_id] = profile_data
        self.save()

    def update_threat_profile(self, profile_id: str, incident_data: Dict[str, Any]):
        if profile_id in self.db["threat_profiles"]:
            prof = self.db["threat_profiles"][profile_id]
            if incident_data["attack_type"] not in prof["attack_types"]:
                prof["attack_types"].append(incident_data["attack_type"])
            if incident_data["tool_signature"] not in prof["tool_signatures"]:
                prof["tool_signatures"].append(incident_data["tool_signature"])
            if incident_data["timing_signature"] not in prof["timing_signatures"]:
                prof["timing_signatures"].append(incident_data["timing_signature"])
            if incident_data["target"] not in prof["targets_attempted"]:
                prof["targets_attempted"].append(incident_data["target"])
            if incident_data["ip"] not in prof["ips_used"]:
                prof["ips_used"].append(incident_data["ip"])
            
            prof["incidents"].append({
                "timestamp": incident_data["timestamp"],
                "ip": incident_data["ip"],
                "target": incident_data["target"],
                "attack_type": incident_data["attack_type"],
                "details": incident_data["details"]
            })
            prof["last_seen"] = incident_data["timestamp"]
            self.save()
            return True
        return False

    def reset_db(self):
        self.db = {
            "traffic": [],
            "alerts": [],
            "locks": {},
            "approvals": {},
            "honeypots": {},
            "honeypot_feed": [],
            "threat_profiles": self.generate_default_profiles()
        }
        self.save()

# Global database instance
db = SecurityDB()
