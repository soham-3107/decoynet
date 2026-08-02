import os
import json
import asyncio
from typing import Dict, List, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load local environment configuration
load_dotenv()

from database import db
from engine import engine
from simulator import LogSimulator

app = FastAPI(title="AI-Powered Autonomous Security Response Engine")

# Enable CORS for the React development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

def ws_broadcast_callback(message: dict):
    try:
        asyncio.create_task(manager.broadcast(message))
        if message.get("type") == "alert":
            asyncio.create_task(manager.broadcast({
                "type": "threat_dna_update",
                "data": db.get_threat_profiles()
            }))
    except Exception as e:
        print(f"Error scheduling WS broadcast: {e}")

# Instantiate & Start the Log Simulator
simulator = LogSimulator(broadcast_callback=ws_broadcast_callback)

@app.on_event("startup")
async def startup_event():
    simulator.start()
    print("Log Simulator started.")

@app.on_event("shutdown")
async def shutdown_event():
    simulator.stop()
    print("Log Simulator stopped.")

# --- API Models ---
class LockdownUndoRequest(BaseModel):
    target: str
    reason: str = "Manual Admin Override"

class ApprovalResponse(BaseModel):
    approval_id: str
    status: str # "approved" | "rejected"

class SimulateAttackRequest(BaseModel):
    attack_type: str # "brute_force" | "port_scan" | "impossible_travel" | "privilege_escalation"
    risk_tier: str   # "Low-Risk" | "High-Risk"

class RuleConfigUpdate(BaseModel):
    rules: Dict[str, Any]

class AssetRegistryUpdate(BaseModel):
    assets: List[Dict[str, Any]]

# --- REST ENDPOINTS ---

@app.get("/api/status")
def get_status():
    return {
        "status": "online",
        "active_connections": len(manager.active_connections),
        "locks_count": len(db.get_locks()),
        "pending_approvals_count": len(db.get_pending_approvals())
    }

@app.get("/api/traffic")
def get_traffic():
    return db.get_traffic()[-100:] # Return last 100 events

@app.get("/api/alerts")
def get_alerts():
    return db.get_alerts()

@app.get("/api/locks")
def get_locks():
    return db.get_locks()

@app.get("/api/locks/history")
def get_lock_history():
    return db.get_lock_history()

@app.get("/api/honeypot/sessions")
def get_honeypot_sessions():
    return db.get_honeypot_sessions()

@app.get("/api/honeypot/feed")
def get_honeypot_feed():
    return db.get_honeypot_feed()

@app.get("/api/threat-profiles")
def get_threat_profiles():
    return db.get_threat_profiles()

@app.post("/api/locks/undo")
async def undo_lockdown(req: LockdownUndoRequest):
    success = db.remove_lock(req.target, req.reason)
    if success:
        # Broadcast state changes
        await manager.broadcast({
            "type": "lock_update",
            "data": {
                "target": req.target,
                "active": False,
                "history": db.get_lock_history()
            }
        })
        return {"status": "success", "message": f"Lockdown removed for {req.target}"}
    raise HTTPException(status_code=404, detail="Target lock not found or already inactive.")

@app.get("/api/approvals")
def get_pending_approvals():
    return db.get_pending_approvals()

@app.get("/api/approvals/all")
def get_all_approvals():
    return db.get_all_approvals()

@app.post("/api/approvals/respond")
async def respond_to_approval(req: ApprovalResponse):
    approval_id = req.approval_id
    status = req.status # "approved" or "rejected"
    
    app_req = db.get_approval_request(approval_id)
    if not app_req:
        raise HTTPException(status_code=404, detail="Approval request not found.")
        
    if app_req["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already in state: {app_req['status']}")
        
    # Update state
    db.update_approval_status(approval_id, status)
    
    if status == "approved":
        # Apply lockdown
        db.add_lock(
            target=app_req["target"],
            lock_type=app_req["lock_type"],
            reason=f"Administrator approved lockdown request {approval_id}.",
            rule=app_req["alert"]["threat_type"]
        )
        # Inform WebSocket
        await manager.broadcast({
            "type": "lock_update",
            "data": {
                "target": app_req["target"],
                "active": True,
                "history": db.get_lock_history()
            }
        })
        
    # Broadcast approval response
    await manager.broadcast({
        "type": "approval_update",
        "data": {
            "approval_id": approval_id,
            "status": status,
            "all_approvals": db.get_all_approvals()
        }
    })
    
    return {"status": "success", "message": f"Request {approval_id} has been {status}."}

@app.post("/api/simulate/attack")
async def simulate_attack(req: SimulateAttackRequest, background_tasks: BackgroundTasks):
    atype = req.attack_type
    tier = req.risk_tier
    
    if atype == "brute_force":
        background_tasks.add_task(simulator.trigger_brute_force_attack, tier)
    elif atype == "port_scan":
        background_tasks.add_task(simulator.trigger_port_scan_attack, tier)
    elif atype == "impossible_travel":
        background_tasks.add_task(simulator.trigger_impossible_travel_attack, tier)
    elif atype == "privilege_escalation":
        background_tasks.add_task(simulator.trigger_privilege_escalation_attack, tier)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown attack type: {atype}")
        
    return {"status": "success", "message": f"Triggered {atype} attack against {tier} asset in background."}

@app.get("/api/config")
def get_config():
    return {
        "rules": engine.rules,
        "assets": engine.assets
    }

@app.post("/api/config/rules")
async def update_rules(req: RuleConfigUpdate):
    engine.rules = req.rules
    if engine.save_configs():
        await manager.broadcast({
            "type": "config_update",
            "data": get_config()
        })
        return {"status": "success", "message": "Rules updated successfully."}
    raise HTTPException(status_code=500, detail="Failed to save rules to file.")

@app.post("/api/config/assets")
async def update_assets(req: AssetRegistryUpdate):
    engine.assets = req.assets
    if engine.save_configs():
        await manager.broadcast({
            "type": "config_update",
            "data": get_config()
        })
        return {"status": "success", "message": "Asset registry updated successfully."}
    raise HTTPException(status_code=500, detail="Failed to save asset registry to file.")

@app.post("/api/config/reset")
async def reset_system():
    db.reset_db()
    await manager.broadcast({
        "type": "system_reset",
        "data": {
            "traffic": [],
            "alerts": [],
            "locks": {},
            "approvals": {},
            "honeypots": {},
            "honeypot_feed": [],
            "threat_profiles": {}
        }
    })
    return {"status": "success", "message": "System logs and database reset successfully."}

# --- SLACK CHANNELS & CALLBACK ENDPOINTS ---

@app.post("/api/slack/interactive")
async def slack_interactive(request: Request):
    form_data = await request.form()
    payload_str = form_data.get("payload")
    if not payload_str:
        raise HTTPException(status_code=400, detail="Missing payload form field.")
        
    try:
        payload = json.loads(payload_str)
        action = payload["actions"][0]
        action_id = action["action_id"]
        approval_id = action["value"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Malformed Slack payload: {e}")
        
    app_req = db.get_approval_request(approval_id)
    if not app_req:
        return {"text": "❌ Approval request not found or expired."}
        
    if app_req["status"] != "pending":
        return {"text": f"ℹ️ This request was already resolved as: *{app_req['status'].upper()}*."}
        
    status = "approved" if action_id == "approve_lockdown" else "rejected"
    
    db.update_approval_status(approval_id, status)
    
    if status == "approved":
        db.add_lock(
            target=app_req["target"],
            lock_type=app_req["lock_type"],
            reason=f"Slack approved lockdown via user '{payload.get('user', {}).get('name', 'Slack Admin')}'.",
            rule=app_req["alert"]["threat_type"]
        )
        await manager.broadcast({
            "type": "lock_update",
            "data": {
                "target": app_req["target"],
                "active": True,
                "history": db.get_lock_history()
            }
        })
        
    await manager.broadcast({
        "type": "approval_update",
        "data": {
            "approval_id": approval_id,
            "status": status,
            "all_approvals": db.get_all_approvals()
        }
    })
    
    msg = f"✅ *Lockdown Approved*" if status == "approved" else "❌ *Alert Dismissed*"
    user_name = payload.get('user', {}).get('name', 'Slack Admin')
    return {
        "replace_original": True,
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"🚨 *HIGH-RISK RESOLVED VIA SLACK*\n{msg} by user *@{user_name}*.\n\n*Original Summary:*\n{app_req['alert']['explainer']}"
                }
            }
        ]
    }

class SlackSimulateClickRequest(BaseModel):
    approval_id: str
    action: str

@app.post("/api/simulate/slack-click")
async def simulate_slack_click(req: SlackSimulateClickRequest):
    approval_id = req.approval_id
    action_type = req.action
    
    app_req = db.get_approval_request(approval_id)
    if not app_req:
        raise HTTPException(status_code=404, detail="Approval request not found.")
        
    if app_req["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request already resolved: {app_req['status']}")
        
    status = "approved" if action_type == "approve" else "rejected"
    
    db.update_approval_status(approval_id, status)
    
    if status == "approved":
        db.add_lock(
            target=app_req["target"],
            lock_type=app_req["lock_type"],
            reason=f"Lockdown approved via simulated Slack Button Click.",
            rule=app_req["alert"]["threat_type"]
        )
        await manager.broadcast({
            "type": "lock_update",
            "data": {
                "target": app_req["target"],
                "active": True,
                "history": db.get_lock_history()
            }
        })
        
    await manager.broadcast({
        "type": "approval_update",
        "data": {
            "approval_id": approval_id,
            "status": status,
            "all_approvals": db.get_all_approvals()
        }
    })
    
    return {
        "status": "success",
        "message": f"Successfully simulated Slack callback for approval {approval_id} as {status}."
    }

# --- WEBSOCKET FEED ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "init",
            "data": {
                "config": get_config(),
                "traffic": db.get_traffic()[-100:],
                "alerts": db.get_alerts(),
                "locks": db.get_locks(),
                "lock_history": db.get_lock_history(),
                "approvals": db.get_pending_approvals(),
                "all_approvals": db.get_all_approvals(),
                "honeypots": db.get_honeypot_sessions(),
                "honeypot_feed": db.get_honeypot_feed(),
                "threat_profiles": db.get_threat_profiles()
            }
        })
        
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS error: {e}")
        manager.disconnect(websocket)
