import os
import json
import time
import math
import uuid
import requests
from typing import Dict, List, Any, Tuple, Optional
from database import db

# Configuration Paths
RULES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "rules.json")
ASSETS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "assets.json")

class SecurityEngine:
    def __init__(self):
        self.rules = {}
        self.assets = []
        
        # State tracking for detection sliding windows
        self.login_failures = {}      # source_ip -> list of timestamps
        self.port_activities = {}      # source_ip -> list of (timestamp, port)
        self.last_logins = {}          # user -> {timestamp, location}
        
        self.load_configs()

    def load_configs(self):
        # Load Rules
        try:
            with open(RULES_FILE, "r") as f:
                self.rules = json.load(f)
        except Exception as e:
            print(f"Error loading rules config: {e}")
            self.rules = {}

        # Load Assets
        try:
            with open(ASSETS_FILE, "r") as f:
                self.assets = json.load(f)
        except Exception as e:
            print(f"Error loading assets config: {e}")
            self.assets = []

    def save_configs(self):
        try:
            with open(RULES_FILE, "w") as f:
                json.dump(self.rules, f, indent=2)
            with open(ASSETS_FILE, "w") as f:
                json.dump(self.assets, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving configs: {e}")
            return False

    def get_asset_info(self, target: str, target_type: str) -> Dict[str, Any]:
        """
        Looks up target in asset registry.
        If target matches, returns its tier and metadata.
        Else, defaults to Low-Risk.
        """
        for asset in self.assets:
            if asset["type"] == target_type and asset["target"].lower() == target.lower():
                return asset
                
        # Default fallback if asset is not registered
        return {
            "id": f"unregistered-{target}",
            "name": f"Unregistered {target_type.upper()}: {target}",
            "target": target,
            "type": target_type,
            "risk_tier": "Low-Risk",
            "description": "Default risk classification for unregistered asset"
        }

    def haversine_distance(self, loc1: Dict[str, float], loc2: Dict[str, float]) -> float:
        """
        Calculates distance in kilometers between two lat/lon points.
        """
        R = 6371.0 # Earth's radius in km
        lat1, lon1 = math.radians(loc1["lat"]), math.radians(loc1["lon"])
        lat2, lon2 = math.radians(loc2["lat"]), math.radians(loc2["lon"])
        
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def get_time_elapsed_str(self, seconds: float) -> str:
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds / 60)}m"
        else:
            return f"{seconds / 3600:.1f}h"

    def generate_plain_english(self, alert_type: str, data: Dict[str, Any], asset_info: Dict[str, Any], action_taken: str) -> str:
        """
        Generates a clean, single-line explainer summary.
        """
        risk_tier = asset_info["risk_tier"]
        
        # Action status label
        if action_taken == "already_blocked":
            status = "Blocked"
        elif risk_tier == "High-Risk":
            status = "Pending Approval"
        else:
            status = "Locked"

        if alert_type == "brute_force":
            return f"Brute force: {data['attempts']} failed logins for '{data['user']}' from IP {data['source_ip']} in {data['window']}s. ({status})."
            
        elif alert_type == "impossible_travel":
            time_str = self.get_time_elapsed_str(data['time_diff'])
            c1 = "US" if data['loc1']['country'] == "United States" else ("UK" if data['loc1']['country'] == "United Kingdom" else data['loc1']['country'])
            c2 = "US" if data['loc2']['country'] == "United States" else ("UK" if data['loc2']['country'] == "United Kingdom" else data['loc2']['country'])
            return f"Impossible travel detected for '{data['user']}' from {c1}/{c2} in {time_str}. ({status})."
            
        elif alert_type == "port_scan":
            return f"Port scan: IP {data['source_ip']} probed {data['ports_count']} ports in {data['window']}s. ({status})."
            
        elif alert_type == "privilege_escalation":
            return f"Privilege escalation: unauthorized admin access by '{data['user']}' on '{data['asset_name']}'. ({status})."
            
        return f"Unknown threat anomaly detected on target. ({status})."

    def post_to_slack(self, approval_id: str, plain_text: str, asset_name: str, risk_tier: str, target: str):
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if not webhook_url:
            print("[Slack] Webhook not configured. Skipping post.")
            return

        headers = {"Content-type": "application/json"}
        # Slack Block Kit payload
        payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🚨 HIGH-RISK SECURITY APPROVAL REQUIRED",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Asset Name:*\n{asset_name}"},
                        {"type": "mrkdwn", "text": f"*Risk Tier:*\n{risk_tier}"}
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Summary:*\n{plain_text}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Approve Lockdown",
                                "emoji": True
                            },
                            "style": "danger",
                            "value": approval_id,
                            "action_id": "approve_lockdown"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Dismiss Alert",
                                "emoji": True
                            },
                            "value": approval_id,
                            "action_id": "dismiss_alert"
                        }
                    ]
                }
            ]
        }

        try:
            response = requests.post(webhook_url, json=payload, headers=headers, timeout=5)
            if response.status_code != 200:
                print(f"[Slack] Webhook returned status code {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[Slack] Webhook post error: {e}")

    def ingest_event(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Ingests a security event from logs and checks if it triggers any rule.
        Returns the alert dict if a threat is detected, otherwise None.
        """
        # Save event to traffic db
        db.add_traffic(event)
        
        event_type = event.get("event_type")
        timestamp = event.get("timestamp", time.time())
        
        alert_details = None
        alert_type = None
        target = None
        target_type = None
        suggested_lock_type = None # "ip" | "user" | "session"
        suggested_action = None    # descriptive string
        
        # 1. BRUTE FORCE DETECTION
        if event_type == "login_attempt" and event.get("status") == "failed":
            rule = self.rules.get("brute_force", {})
            if rule.get("enabled", True):
                src_ip = event.get("source_ip")
                user = event.get("user")
                
                if src_ip not in self.login_failures:
                    self.login_failures[src_ip] = []
                self.login_failures[src_ip].append(timestamp)
                
                # Filter sliding window
                window = rule.get("window_seconds", 15)
                self.login_failures[src_ip] = [t for t in self.login_failures[src_ip] if timestamp - t <= window]
                
                if len(self.login_failures[src_ip]) >= rule.get("max_attempts", 5):
                    alert_type = "brute_force"
                    target = src_ip
                    target_type = "ip"
                    suggested_lock_type = "ip"
                    suggested_action = f"Block IP Address {src_ip}"
                    alert_details = {
                        "source_ip": src_ip,
                        "user": user,
                        "attempts": len(self.login_failures[src_ip]),
                        "window": window
                    }
                    # Reset failure history to avoid double triggering immediately
                    self.login_failures[src_ip] = []

        # 2. PORT SCAN DETECTION
        elif event_type == "connection_attempt":
            rule = self.rules.get("port_scan", {})
            if rule.get("enabled", True):
                src_ip = event.get("source_ip")
                dest_port = event.get("destination_port")
                
                if src_ip not in self.port_activities:
                    self.port_activities[src_ip] = []
                self.port_activities[src_ip].append((timestamp, dest_port))
                
                # Filter sliding window
                window = rule.get("window_seconds", 10)
                self.port_activities[src_ip] = [(t, p) for t, p in self.port_activities[src_ip] if timestamp - t <= window]
                
                # Count unique ports
                unique_ports = {p for t, p in self.port_activities[src_ip]}
                if len(unique_ports) >= rule.get("max_ports", 8):
                    alert_type = "port_scan"
                    target = src_ip
                    target_type = "ip"
                    suggested_lock_type = "ip"
                    suggested_action = f"Block IP Address {src_ip}"
                    alert_details = {
                        "source_ip": src_ip,
                        "ports_count": len(unique_ports),
                        "ports": list(unique_ports),
                        "window": window
                    }
                    # Reset
                    self.port_activities[src_ip] = []

        # 3. IMPOSSIBLE TRAVEL DETECTION
        elif event_type == "login_attempt" and event.get("status") == "success":
            rule = self.rules.get("impossible_travel", {})
            if rule.get("enabled", True):
                user = event.get("user")
                loc = event.get("location") # Expected: {"country": "USA", "lat": 40.71, "lon": -74.0}
                
                if loc and "lat" in loc and "lon" in loc:
                    prev_login = self.last_logins.get(user)
                    self.last_logins[user] = {"timestamp": timestamp, "location": loc}
                    
                    if prev_login:
                        time_diff = timestamp - prev_login["timestamp"]
                        dist = self.haversine_distance(prev_login["location"], loc)
                        
                        if time_diff > 1 and dist > 5: # more than 1 sec apart and 5km apart
                            hours = time_diff / 3600.0
                            speed = dist / hours if hours > 0 else 0
                            
                            max_speed = rule.get("max_speed_kmh", 1000)
                            if speed > max_speed:
                                alert_type = "impossible_travel"
                                target = user
                                target_type = "user"
                                suggested_lock_type = "user"
                                suggested_action = f"Disable User Account '{user}'"
                                alert_details = {
                                    "user": user,
                                    "loc1": prev_login["location"],
                                    "loc2": loc,
                                    "distance_km": dist,
                                    "time_diff": time_diff,
                                    "speed": speed
                                }
                                # Reset location tracking for this user to avoid repeating alerts on next login
                                self.last_logins[user] = None

        # 4. PRIVILEGE ESCALATION DETECTION
        elif event_type == "privilege_escalation":
            rule = self.rules.get("privilege_escalation", {})
            if rule.get("enabled", True):
                user = event.get("user")
                asset_name = event.get("asset", "Main Controller")
                authorized = event.get("authorized", False)
                
                if not authorized:
                    alert_type = "privilege_escalation"
                    target = user
                    target_type = "user"
                    suggested_lock_type = "session"
                    suggested_action = f"Terminate Sessions for '{user}'"
                    alert_details = {
                        "user": user,
                        "asset_name": asset_name
                    }

        # Handle alert generation if a threat was flagged
        if alert_type and alert_details:
            # Look up risk tier based on the target of the alert
            asset_info = self.get_asset_info(target, target_type)
            risk_tier = asset_info["risk_tier"]
            severity_score = self.rules.get(alert_type, {}).get("severity_score", 80)
            
            # Check if already locked
            is_currently_locked = db.is_locked(target)
            action_taken = "already_blocked" if is_currently_locked else ("pending" if risk_tier == "High-Risk" else "locked_down")

             # Generate the plain English translation (clean, single-line)
            explainer = self.generate_plain_english(alert_type, alert_details, asset_info, action_taken)
            
            # Attacker Fingerprinting (Threat DNA)
            ip = target if target_type == "ip" else event.get("source_ip", "10.0.0.199")
            attack_type = alert_type
            
            # Map mock tool agent signature based on attack types
            if alert_type == "brute_force":
                tool_signature = "Hydra/9.2"
                timing_signature = "Burst Scan (High-Frequency)"
            elif alert_type == "port_scan":
                tool_signature = "Nmap/7.92"
                timing_signature = "Burst Scan (High-Frequency)"
            elif alert_type == "privilege_escalation":
                tool_signature = "Metasploit-Framework (m_privesc)"
                timing_signature = "Targeted Command"
            else: # impossible_travel
                tool_signature = "Browser (Mozilla-Gecko)"
                timing_signature = "Low-and-Slow (Interval Delay)"
                
            matched_prof_id = None
            matched_prof = None
            highest_score = 0
            
            # Rule-based similarity matching (Threshold: 70 points)
            for prof_id, prof in db.get_threat_profiles().items():
                score = 0
                if attack_type in prof.get("attack_types", []):
                    score += 30
                if tool_signature in prof.get("tool_signatures", []):
                    score += 45
                if timing_signature in prof.get("timing_signatures", []):
                    score += 25
                
                if score >= 70 and score > highest_score:
                    highest_score = score
                    matched_prof_id = prof_id
                    matched_prof = prof
                    
            if matched_prof_id and matched_prof:
                # Update existing profile
                incident_data = {
                    "timestamp": timestamp,
                    "ip": ip,
                    "target": target,
                    "attack_type": attack_type,
                    "details": explainer,
                    "tool_signature": tool_signature,
                    "timing_signature": timing_signature
                }
                db.update_threat_profile(matched_prof_id, incident_data)
                
                incidents_count = len(matched_prof["incidents"]) # includes updated
                threat_dna = {
                    "profile_id": matched_prof_id,
                    "profile_name": matched_prof["name"],
                    "incidents_count": incidents_count,
                    "first_seen": matched_prof["first_seen"],
                    "last_seen": timestamp,
                    "matched": True,
                    "tool_signature": tool_signature,
                    "timing_signature": timing_signature
                }
                # Prepend to explainer:
                explainer = f"Repeat attacker detected (Profile {matched_prof['name']}), previously blocked {incidents_count - 1} time{'s' if incidents_count - 1 > 1 else ''} this week. " + explainer
            else:
                # Create a new profile
                import random
                actor_names = ["Shadow-Broker", "Cozy-Bear", "Fancy-Bear", "Lazarus-Decoy", "Sandworm-Mimic", "Volt-Typhoon", "Silent-Crawler", "LockBit-Clone", "APT-Fingerprint-104", "Threat-Actor-82"]
                actor_name = random.choice(actor_names) + f"-{random.randint(10, 99)}"
                matched_prof_id = f"profile-{uuid.uuid4().hex[:6]}"
                
                prof_data = {
                    "id": matched_prof_id,
                    "name": actor_name,
                    "attack_types": [attack_type],
                    "tool_signatures": [tool_signature],
                    "timing_signatures": [timing_signature],
                    "targets_attempted": [target],
                    "ips_used": [ip],
                    "first_seen": timestamp,
                    "last_seen": timestamp,
                    "incidents": [{
                        "timestamp": timestamp,
                        "ip": ip,
                        "target": target,
                        "attack_type": attack_type,
                        "details": explainer
                    }]
                }
                db.add_threat_profile(matched_prof_id, prof_data)
                
                threat_dna = {
                    "profile_id": matched_prof_id,
                    "profile_name": actor_name,
                    "incidents_count": 1,
                    "first_seen": timestamp,
                    "last_seen": timestamp,
                    "matched": False,
                    "tool_signature": tool_signature,
                    "timing_signature": timing_signature
                }
                
            alert = {
                "id": f"alert-{uuid.uuid4().hex[:8]}",
                "timestamp": timestamp,
                "threat_type": alert_type,
                "details": alert_details,
                "target": target,
                "target_type": target_type,
                "suggested_lock_type": suggested_lock_type,
                "suggested_action": suggested_action,
                "severity_score": severity_score,
                "asset_info": asset_info,
                "explainer": explainer,
                "threat_dna": threat_dna,
                "raw_event": event
            }
            
            db.add_alert(alert)
            
            if is_currently_locked:
                return alert
                
            # SILENT DECOY REDIRECTION IN PARALLEL
            decoy_type = "fake_file_share"
            if target_type == "user":
                decoy_type = "fake_login" if alert_type == "brute_force" else "fake_session_shell"
            elif "database" in asset_info["name"].lower() or "db" in asset_info["name"].lower():
                decoy_type = "fake_database"
            elif "controller" in asset_info["name"].lower() or "directory" in asset_info["name"].lower():
                decoy_type = "fake_session_shell"
                
            hp_session_id = f"decoy-{uuid.uuid4().hex[:8]}"
            alert["honeypot_session_id"] = hp_session_id
            alert["decoy_type"] = decoy_type
            
            db.add_honeypot_session(
                session_id=hp_session_id,
                attacker=target,
                asset=asset_info["name"],
                decoy_type=decoy_type
            )
            
            # Perform response logic depending on asset risk tier
            if risk_tier == "Low-Risk":
                db.add_lock(
                    target=target,
                    lock_type=suggested_lock_type,
                    reason=f"Automated defense triggered by rule '{alert_type}': {explainer}",
                    rule=alert_type
                )
                alert["action_status"] = "Auto-Locked"
            else:
                approval_id = f"req-{uuid.uuid4().hex[:8]}"
                db.add_approval_request(approval_id, alert, timeout_seconds=60)
                alert["action_status"] = "Awaiting Approval"
                alert["approval_id"] = approval_id
                
                # Send notifications to Slack
                self.post_to_slack(
                    approval_id=approval_id,
                    plain_text=explainer,
                    asset_name=asset_info["name"],
                    risk_tier=risk_tier,
                    target=target
                )
                
            return alert
            
        return None

# Global engine instance
engine = SecurityEngine()
