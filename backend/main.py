from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
import json
import time
import os
import httpx
from pathlib import Path
from datetime import datetime
from scanner import scan_wheel, scan_text_for_injection

app = FastAPI(title="Vigil", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent / "vigil.db"
SLACK_WEBHOOK = os.getenv("VIGIL_SLACK_WEBHOOK", "")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            event_type TEXT NOT NULL,
            package TEXT,
            score REAL,
            verdict TEXT,
            findings TEXT,
            scan_ms INTEGER,
            machine TEXT,
            extra TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS killed_agents (
            agent_id TEXT PRIMARY KEY,
            killed_at REAL NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

init_db()

class ScanPackageRequest(BaseModel):
    package: str
    machine: Optional[str] = "localhost"

class ScanTextRequest(BaseModel):
    content: str
    source: str
    agent_id: Optional[str] = "agent-1"

class DemoAttackRequest(BaseModel):
    pass

def save_event(event_type: str, package: Optional[str], score: Optional[float], 
               verdict: Optional[str], findings: List[Dict], scan_ms: int, 
               machine: str, extra: Optional[Dict] = None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO events (ts, event_type, package, score, verdict, findings, scan_ms, machine, extra)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        time.time(),
        event_type,
        package,
        score,
        verdict,
        json.dumps(findings),
        scan_ms,
        machine,
        json.dumps(extra) if extra else None
    ))
    
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    
    return event_id

async def send_slack_alert(package: str, score: float, verdict: str, findings: List[Dict]):
    if not SLACK_WEBHOOK:
        return
    
    top_finding = findings[0]["detail"] if findings else "Multiple suspicious patterns detected"
    
    message = {
        "text": f"🚨 *Vigil {verdict}* — `{package}` | Score: `{score}` | Reason: {top_finding} | _Vigil — Always Watching_"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(SLACK_WEBHOOK, json=message, timeout=5.0)
    except Exception:
        pass

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/events")
async def get_events(limit: int = 50):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, ts, event_type, package, score, verdict, findings, scan_ms, machine, extra
        FROM events
        ORDER BY ts DESC
        LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    events = []
    for row in rows:
        events.append({
            "id": row[0],
            "ts": row[1],
            "event_type": row[2],
            "package": row[3],
            "score": row[4],
            "verdict": row[5],
            "findings": json.loads(row[6]) if row[6] else [],
            "scan_ms": row[7],
            "machine": row[8],
            "extra": json.loads(row[9]) if row[9] else None
        })
    
    return events

@app.post("/scan/package")
async def scan_package(request: ScanPackageRequest):
    package_name = request.package
    machine = request.machine
    
    mock_packages_dir = Path(__file__).parent.parent / "mock_packages"
    
    wheel_file = None
    if mock_packages_dir.exists():
        for file in mock_packages_dir.glob("*.whl"):
            if package_name.lower().replace("==", "-").replace("_", "-") in file.name.lower():
                wheel_file = file
                break
    
    if wheel_file and wheel_file.exists():
        result = scan_wheel(str(wheel_file))
    else:
        result = {
            "score": 0.0,
            "verdict": "ALLOWED",
            "blocked": False,
            "findings": [],
            "scan_ms": 100
        }
    
    event_id = save_event(
        event_type="scan",
        package=package_name,
        score=result["score"],
        verdict=result["verdict"],
        findings=result["findings"],
        scan_ms=result["scan_ms"],
        machine=machine
    )
    
    event_data = {
        "type": "scan_event",
        "id": event_id,
        "ts": time.time(),
        "package": package_name,
        "score": result["score"],
        "verdict": result["verdict"],
        "blocked": result["blocked"],
        "findings": result["findings"],
        "scan_ms": result["scan_ms"],
        "machine": machine
    }
    
    await manager.broadcast(event_data)
    
    if result["verdict"] in ["BLOCKED", "WARNING"]:
        await send_slack_alert(package_name, result["score"], result["verdict"], result["findings"])
    
    return result

@app.post("/scan/text")
async def scan_text(request: ScanTextRequest):
    result = scan_text_for_injection(request.content, request.source)
    
    event_id = save_event(
        event_type="alignment_scan",
        package=None,
        score=result["score"],
        verdict=result["verdict"],
        findings=result["findings"],
        scan_ms=result["scan_ms"],
        machine="localhost",
        extra={
            "source": request.source,
            "agent_id": request.agent_id
        }
    )
    
    event_data = {
        "type": "align_event",
        "id": event_id,
        "ts": time.time(),
        "source": request.source,
        "agent_id": request.agent_id,
        "score": result["score"],
        "verdict": result["verdict"],
        "blocked": result["blocked"],
        "findings": result["findings"],
        "scan_ms": result["scan_ms"]
    }
    
    await manager.broadcast(event_data)
    
    if result["verdict"] == "BLOCKED":
        await send_slack_alert(f"Document: {request.source}", result["score"], result["verdict"], result["findings"])
    
    return result

@app.post("/demo/attack")
async def demo_attack():
    event_id = save_event(
        event_type="attack_demo",
        package="mock-litellm==1.82.7",
        score=1.0,
        verdict="COMPROMISED",
        findings=[
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "AWS_ACCESS_KEY_ID captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "SSH private key captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "OPENAI_API_KEY captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "ANTHROPIC_API_KEY captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "GITHUB_TOKEN captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": ".kube/config captured"},
            {"type": "EXFILTRATION", "severity": "CRITICAL", "detail": "Data sent to models.litellm.cloud"}
        ],
        scan_ms=0,
        machine="localhost",
        extra={"demo": True, "attack_type": "supply_chain"}
    )
    
    event_data = {
        "type": "attack_event",
        "id": event_id,
        "ts": time.time(),
        "package": "mock-litellm==1.82.7",
        "score": 1.0,
        "verdict": "COMPROMISED",
        "findings": [
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "AWS_ACCESS_KEY_ID captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "SSH private key captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "OPENAI_API_KEY captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "ANTHROPIC_API_KEY captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": "GITHUB_TOKEN captured"},
            {"type": "CREDENTIAL_THEFT", "severity": "CRITICAL", "detail": ".kube/config captured"},
            {"type": "EXFILTRATION", "severity": "CRITICAL", "detail": "Data sent to models.litellm.cloud"}
        ],
        "demo": True
    }
    
    await manager.broadcast(event_data)
    
    return {"status": "attack_simulated", "credentials_stolen": 6}

@app.post("/agents/{agent_id}/kill")
async def kill_agent(agent_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT OR REPLACE INTO killed_agents (agent_id, killed_at)
        VALUES (?, ?)
    """, (agent_id, time.time()))
    
    conn.commit()
    conn.close()
    
    event_data = {
        "type": "kill_event",
        "ts": time.time(),
        "agent_id": agent_id
    }
    
    await manager.broadcast(event_data)
    
    return {"status": "killed", "agent_id": agent_id}

@app.get("/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT killed_at FROM killed_agents WHERE agent_id = ?
    """, (agent_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {"killed": True, "killed_at": row[0]}
    else:
        return {"killed": False}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, ts, event_type, package, score, verdict, findings, scan_ms, machine, extra
            FROM events
            ORDER BY ts DESC
            LIMIT 50
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            event = {
                "id": row[0],
                "ts": row[1],
                "event_type": row[2],
                "package": row[3],
                "score": row[4],
                "verdict": row[5],
                "findings": json.loads(row[6]) if row[6] else [],
                "scan_ms": row[7],
                "machine": row[8],
                "extra": json.loads(row[9]) if row[9] else None
            }
            history.append(event)
        
        await websocket.send_json({
            "type": "history",
            "events": history
        })
        
        while True:
            data = await websocket.receive_text()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
