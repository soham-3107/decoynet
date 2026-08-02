import time
import random
import asyncio
from typing import Dict, Any, List, Callable
from engine import engine
from database import db

COUNTRIES = [
    {"country": "United States", "lat": 37.77, "lon": -122.41},
    {"country": "Japan", "lat": 35.67, "lon": 139.65},
    {"country": "Germany", "lat": 52.52, "lon": 13.40},
    {"country": "Brazil", "lat": -23.55, "lon": -46.63},
    {"country": "Australia", "lat": -33.86, "lon": 151.20},
    {"country": "Canada", "lat": 45.42, "lon": -75.69},
    {"country": "United Kingdom", "lat": 51.50, "lon": -0.12},
    {"country": "Singapore", "lat": 1.35, "lon": 103.81}
]

IPS = [
    "192.168.1.10", "192.168.1.11", "192.168.1.12",
    "10.0.0.101", "10.0.0.102", "10.0.0.103",
    "172.16.0.5", "172.16.0.6", "172.16.0.7"
]

USERS = ["alice", "bob", "charlie", "support_tech", "marketing_user", "contractor_1"]

class LogSimulator:
    def __init__(self, broadcast_callback: Callable[[Dict[str, Any]], None]):
        self.broadcast_callback = broadcast_callback
        self.running = False
        self._task = None

    def start(self):
        self.running = True
        self._task = asyncio.create_task(self.run())

    def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()

    async def run(self):
        while self.running:
            try:
                event = self.generate_normal_event()
                alert = engine.ingest_event(event)
                
                payload = {"type": "traffic", "data": event}
                self.broadcast_callback(payload)
                
                if alert:
                    alert_payload = {"type": "alert", "data": alert}
                    self.broadcast_callback(alert_payload)
                    
                # Background honeypot activity simulation
                if random.random() < 0.20:
                    if "decoy-bg-scanner" not in db.get_honeypot_sessions():
                        db.add_honeypot_session("decoy-bg-scanner", "185.220.101.44", "FTP Backup Server", "fake_file_share")
                    
                    bg_details = [
                        "FTP Audit: Attempted directory traversal on decoy service port 21",
                        "FTP Audit: Attempted download of synthetic document 'index.txt' (decoy asset)",
                        "FTP Audit: Attempted download of synthetic document 'release_notes_v4.pdf' (decoy asset)",
                        "File Read: Read operation processed on decoy directory path '/decoy/backups/'",
                        "FTP Audit: FTP command executed: 'PASV' (Passive Mode)",
                        "Shell Audit: Shell command executed: 'pwd'",
                        "SMB Audit: SMB directory listing requested on network path '/network-vault/'"
                    ]
                    db.add_honeypot_activity("decoy-bg-scanner", "background_scan", random.choice(bg_details))
                    self.broadcast_callback({
                        "type": "honeypot_update",
                        "data": {
                            "sessions": db.get_honeypot_sessions(),
                            "feed": db.get_honeypot_feed()
                        }
                    })
                    
                # Background Threat DNA activity simulation
                if random.random() < 0.12:
                    profiles = db.get_threat_profiles()
                    if profiles:
                        profile_id = random.choice(list(profiles.keys()))
                        prof = profiles[profile_id]
                        
                        ip = random.choice(prof.get("ips_used", ["185.220.101.44"]))
                        target = random.choice(prof.get("targets_attempted", ["10.0.0.5"]))
                        attack_type = random.choice(prof.get("attack_types", ["port_scan"]))
                        tool = random.choice(prof.get("tool_signatures", ["Nmap/7.92"]))
                        timing = random.choice(prof.get("timing_signatures", ["Burst Scan"]))
                        
                        details_options = {
                            "port_scan": f"Decoy Probe: Reconnaissance scan logged on port {random.choice([22, 80, 443, 3389])} from untrusted IP.",
                            "brute_force": f"Decoy Auth Audit: Unsuccessful login verification logged on root administrative account.",
                            "privilege_escalation": f"Decoy Sandbox: Checked environment path variables for vulnerable profiles."
                        }
                        details = details_options.get(attack_type, "Decoy Activity: Probe logged matching adversary fingerprint.")
                        
                        incident_data = {
                            "timestamp": time.time(),
                            "ip": ip,
                            "target": target,
                            "attack_type": attack_type,
                            "details": details,
                            "tool_signature": tool,
                            "timing_signature": timing
                        }
                        db.update_threat_profile(profile_id, incident_data)
                        
                        self.broadcast_callback({
                            "type": "threat_dna_update",
                            "data": db.get_threat_profiles()
                        })
                    
                await asyncio.sleep(random.uniform(1.2, 3.0))
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Simulator loop error: {e}")
                await asyncio.sleep(2)

    def generate_normal_event(self) -> Dict[str, Any]:
        event_types = ["http_request", "login_attempt", "db_query", "file_access"]
        etype = random.choice(event_types)
        now = time.time()
        
        if etype == "http_request":
            return {
                "timestamp": now,
                "source_ip": random.choice(IPS),
                "event_type": "http_request",
                "method": random.choice(["GET", "POST", "PUT"]),
                "path": random.choice(["/index.html", "/api/v1/products", "/static/logo.png", "/dashboard"]),
                "status_code": random.choice([200, 200, 200, 304, 404])
            }
            
        elif etype == "login_attempt":
            loc = random.choice(COUNTRIES)
            return {
                "timestamp": now,
                "source_ip": random.choice(IPS),
                "event_type": "login_attempt",
                "status": "success",
                "user": random.choice(USERS),
                "location": {
                    "country": loc["country"],
                    "lat": loc["lat"],
                    "lon": loc["lon"]
                }
            }
            
        elif etype == "db_query":
            return {
                "timestamp": now,
                "source_ip": random.choice(IPS),
                "event_type": "db_query",
                "query": random.choice([
                    "SELECT * FROM items WHERE id = 4",
                    "INSERT INTO logs (level, msg) VALUES ('info', 'alive')",
                    "SELECT count(*) FROM users",
                    "SELECT name, price FROM catalog"
                ]),
                "database": random.choice(["inventory_db", "web_cache"])
            }
            
        else: # file_access
            return {
                "timestamp": now,
                "source_ip": random.choice(IPS),
                "event_type": "file_access",
                "filepath": random.choice([
                    "/var/www/html/index.php",
                    "/etc/resolv.conf",
                    "/home/user/document.pdf",
                    "/var/log/nginx/access.log"
                ]),
                "action": random.choice(["read", "read", "write"])
            }

    async def trigger_brute_force_attack(self, target_tier: str) -> List[Dict[str, Any]]:
        events = []
        now = time.time()
        
        if target_tier == "High-Risk":
            src_ip = "10.0.0.5"
            user = "admin"
        else:
            src_ip = "192.168.50.45"
            user = "guest_temp"
            
        rule = engine.rules.get("brute_force", {})
        attempts = rule.get("max_attempts", 5)
        
        for i in range(attempts):
            event = {
                "timestamp": now + (i * 0.1),
                "source_ip": src_ip,
                "event_type": "login_attempt",
                "status": "failed",
                "user": user,
                "details": f"Failed password attempt {i+1} of {attempts}"
            }
            events.append(event)
            
            alert = engine.ingest_event(event)
            self.broadcast_callback({"type": "traffic", "data": event})
            
            if alert:
                self.broadcast_callback({"type": "alert", "data": alert})
                if "honeypot_session_id" in alert:
                    asyncio.create_task(self.simulate_honeypot_telemetry(alert["honeypot_session_id"], alert["decoy_type"]))
                
            await asyncio.sleep(0.05)
            
        return events

    async def trigger_port_scan_attack(self, target_tier: str) -> List[Dict[str, Any]]:
        events = []
        now = time.time()
        
        if target_tier == "High-Risk":
            src_ip = "10.0.0.20"
        else:
            src_ip = "10.0.0.150"
            
        rule = engine.rules.get("port_scan", {})
        ports_count = rule.get("max_ports", 8)
        scan_ports = [21, 22, 23, 25, 80, 110, 443, 445, 1433, 3306, 3389][:ports_count]
        
        for i, port in enumerate(scan_ports):
            event = {
                "timestamp": now + (i * 0.1),
                "source_ip": src_ip,
                "event_type": "connection_attempt",
                "destination_port": port,
                "details": f"SYN scan probe to port {port}"
            }
            events.append(event)
            
            alert = engine.ingest_event(event)
            self.broadcast_callback({"type": "traffic", "data": event})
            
            if alert:
                self.broadcast_callback({"type": "alert", "data": alert})
                if "honeypot_session_id" in alert:
                    asyncio.create_task(self.simulate_honeypot_telemetry(alert["honeypot_session_id"], alert["decoy_type"]))
                
            await asyncio.sleep(0.05)
            
        return events

    async def trigger_impossible_travel_attack(self, target_tier: str) -> List[Dict[str, Any]]:
        events = []
        now = time.time()
        
        if target_tier == "High-Risk":
            user = "finance_mgr"
            ip1, ip2 = "10.0.0.20", "198.51.100.12"
        else:
            user = "dev_user"
            ip1, ip2 = "10.0.0.100", "203.0.113.88"
            
        event1 = {
            "timestamp": now - 30,
            "source_ip": ip1,
            "event_type": "login_attempt",
            "status": "success",
            "user": user,
            "location": {"country": "United States", "lat": 40.71, "lon": -74.00}
        }
        events.append(event1)
        engine.ingest_event(event1)
        self.broadcast_callback({"type": "traffic", "data": event1})
        
        event2 = {
            "timestamp": now,
            "source_ip": ip2,
            "event_type": "login_attempt",
            "status": "success",
            "user": user,
            "location": {"country": "Japan", "lat": 35.67, "lon": 139.65}
        }
        events.append(event2)
        
        alert = engine.ingest_event(event2)
        self.broadcast_callback({"type": "traffic", "data": event2})
        
        if alert:
            self.broadcast_callback({"type": "alert", "data": alert})
            if "honeypot_session_id" in alert:
                asyncio.create_task(self.simulate_honeypot_telemetry(alert["honeypot_session_id"], alert["decoy_type"]))
            
        return events

    async def trigger_privilege_escalation_attack(self, target_tier: str) -> List[Dict[str, Any]]:
        now = time.time()
        
        if target_tier == "High-Risk":
            user = "admin"
            asset_target = "10.0.0.5"
            asset_name = "Active Directory Domain Controller"
        else:
            user = "guest_temp"
            asset_target = "192.168.50.0/24"
            asset_name = "Guest Wi-Fi DHCP Range"
            
        event = {
            "timestamp": now,
            "source_ip": "10.0.0.199",
            "event_type": "privilege_escalation",
            "user": user,
            "target": asset_target,
            "asset": asset_name,
            "authorized": False,
            "details": f"Attempted to run 'sudo systemctl stop domain_controller' without authorized credential token."
        }
        
        alert = engine.ingest_event(event)
        self.broadcast_callback({"type": "traffic", "data": event})
        
        if alert:
            self.broadcast_callback({"type": "alert", "data": alert})
            if "honeypot_session_id" in alert:
                asyncio.create_task(self.simulate_honeypot_telemetry(alert["honeypot_session_id"], alert["decoy_type"]))
            
        return [event]

    async def simulate_honeypot_telemetry(self, session_id: str, decoy_type: str):
        # Define simulation sequences
        sequences = {
            "fake_database": [
                ("connection_established", "TCP Handshake: Decoy connection established on database port 1433"),
                ("query_executed", "SQL Audit: SELECT statement processed on table 'customer_accounts'"),
                ("query_executed", "SQL Audit: Attempted extraction of columns 'credit_card_num', 'cvv' from table 'billing_info'"),
                ("data_exfiltration", "Exfiltration Alert: Triggered bulk download of 2,500 synthetic credit card records"),
                ("privilege_upgrade", "Security Violation: Attempted grant admin permissions to decoy role 'guest_user'"),
                ("session_terminated", "Decoy Session: Inactive timeout reached; socket connection closed")
            ],
            "fake_file_share": [
                ("directory_browsed", "SMB Audit: Directory listing requested on network share path '/network-vault/'"),
                ("directory_browsed", "SMB Audit: Access granted to restricted folder '/network-vault/finance/2026/'"),
                ("file_read", "File Read: Attempted download of synthetic document 'finance_q2_summary.xlsx'"),
                ("file_read", "File Read: Attempted download of synthetic document 'employee_payroll_records.csv'"),
                ("write_attempt", "Security Violation: Attempted write operation of executable payload 'check_backups.bat'"),
                ("session_terminated", "Decoy Session: Attacker disconnected from network share 'share-01'")
            ],
            "fake_login": [
                ("portal_accessed", "HTTP Audit: GET request processed on admin login gateway '/admin/login'"),
                ("authentication_success", "Auth Success: Credentials verified (session redirected to decoy sandbox portal)"),
                ("portal_browsed", "HTTP Audit: Browsed systems configuration settings tab in decoy dashboard"),
                ("config_read", "File Read: Attempted download of synthetic architecture map 'decoy_subnet_map.pdf'"),
                ("command_executed", "Diagnostic Audit: Simulated systems utility 'diagnostics.sh' executed"),
                ("session_terminated", "Decoy Session: Browser tab closed; HTTP session expired")
            ],
            "fake_session_shell": [
                ("shell_connected", "Interactive Terminal: SSH session established on decoy interface"),
                ("command_executed", "Shell Audit: Command executed: 'whoami' (returned user context: root)"),
                ("command_executed", "Shell Audit: Command executed: 'cat /etc/passwd' (returned synthetic system accounts list)"),
                ("command_executed", "Shell Audit: Command executed: 'rm -rf /etc/systemd' (intercepted and suppressed)"),
                ("command_executed", "Security Violation: Attempted execution of unverified script 'payload.sh'"),
                ("session_terminated", "Decoy Session: SSH connection terminated by firewall override")
            ]
        }
        
        steps = sequences.get(decoy_type, [
            ("activity_detected", "Attacker performed unspecified action on decoy asset"),
            ("session_terminated", "Attacker decoy session ended")
        ])
        
        # Wait a bit before starting (1-2 seconds after lockdown alerts appear)
        await asyncio.sleep(2.0)
        
        for action, details in steps:
            # Check if database has been reset in the middle of simulation
            active_sessions = db.get_honeypot_sessions()
            if session_id not in active_sessions or active_sessions[session_id].get("status") == "completed":
                break
                
            db.add_honeypot_activity(session_id, action, details)
            
            # Broadcast the honeypot status change via WebSocket
            self.broadcast_callback({
                "type": "honeypot_update",
                "data": {
                    "sessions": db.get_honeypot_sessions(),
                    "feed": db.get_honeypot_feed()
                }
            })
            
            # Wait 3 seconds between actions
            await asyncio.sleep(3.0)
            
        # Complete session if not already completed
        if session_id in db.get_honeypot_sessions() and db.get_honeypot_sessions()[session_id].get("status") == "active":
            db.complete_honeypot_session(session_id)
            self.broadcast_callback({
                "type": "honeypot_update",
                "data": {
                    "sessions": db.get_honeypot_sessions(),
                    "feed": db.get_honeypot_feed()
                }
            })
