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
from dotenv import load_dotenv
from scanner import scan_wheel, scan_text_for_injection
from scan_planner import generate_scan_plan, save_scan_plan, get_scan_plans, get_scan_plan_by_id, fetch_repo_info
from cve_analyzer import analyze_package_cves, get_cve_summary

# Load environment variables from .env file
load_dotenv()

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
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_url TEXT NOT NULL,
            project_name TEXT,
            risk_level TEXT,
            plan_json TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            model TEXT
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

@app.post("/demo/populate")
async def demo_populate():
    """Populate the feed with multiple demo packages"""
    demo_packages = [
        {
            "package": "requests==2.25.0",
            "verdict": "WARNING",
            "score": 0.45,
            "findings": [
                {"type": "OUTDATED_DEPENDENCY", "severity": "MEDIUM", "detail": "Package version is outdated"},
                {"type": "KNOWN_VULNERABILITY", "severity": "MEDIUM", "detail": "CVE-2021-33503: Potential ReDoS vulnerability"}
            ]
        },
        {
            "package": "pillow==8.1.0",
            "verdict": "BLOCKED",
            "score": 0.85,
            "findings": [
                {"type": "CRITICAL_CVE", "severity": "CRITICAL", "detail": "CVE-2021-23437: Buffer overflow vulnerability"},
                {"type": "SECURITY_ISSUE", "severity": "HIGH", "detail": "Multiple security vulnerabilities in image processing"}
            ]
        },
        {
            "package": "django==3.1.0",
            "verdict": "WARNING",
            "score": 0.52,
            "findings": [
                {"type": "OUTDATED_VERSION", "severity": "MEDIUM", "detail": "Django 3.1.0 has known security issues"},
                {"type": "CVE_FOUND", "severity": "MEDIUM", "detail": "CVE-2021-31542: Potential directory traversal"}
            ]
        },
        {
            "package": "numpy==1.21.0",
            "verdict": "ALLOWED",
            "score": 0.05,
            "findings": []
        },
        {
            "package": "flask==1.1.1",
            "verdict": "WARNING",
            "score": 0.38,
            "findings": [
                {"type": "OUTDATED_DEPENDENCY", "severity": "LOW", "detail": "Newer version available with security fixes"}
            ]
        },
        {
            "package": "tensorflow==2.4.0",
            "verdict": "ALLOWED",
            "score": 0.12,
            "findings": [
                {"type": "MINOR_ISSUE", "severity": "LOW", "detail": "Consider updating to latest patch version"}
            ]
        },
        {
            "package": "urllib3==1.26.3",
            "verdict": "ALLOWED",
            "score": 0.08,
            "findings": []
        },
        {
            "package": "pyyaml==5.3.1",
            "verdict": "BLOCKED",
            "score": 0.92,
            "findings": [
                {"type": "CRITICAL_CVE", "severity": "CRITICAL", "detail": "CVE-2020-14343: Arbitrary code execution via unsafe loading"},
                {"type": "SECURITY_RISK", "severity": "HIGH", "detail": "Known deserialization vulnerability"}
            ]
        }
    ]
    
    events = []
    for pkg_data in demo_packages:
        event_id = save_event(
            event_type="scan",
            package=pkg_data["package"],
            score=pkg_data["score"],
            verdict=pkg_data["verdict"],
            findings=pkg_data["findings"],
            scan_ms=100 + (hash(pkg_data["package"]) % 200),
            machine="localhost",
            extra={"demo": True}
        )
        
        event_data = {
            "type": "scan_event",
            "id": event_id,
            "ts": time.time(),
            "package": pkg_data["package"],
            "score": pkg_data["score"],
            "verdict": pkg_data["verdict"],
            "findings": pkg_data["findings"],
            "scan_ms": 100 + (hash(pkg_data["package"]) % 200),
            "demo": True
        }
        
        await manager.broadcast(event_data)
        events.append(event_data)
    
    return {"success": True, "packages_added": len(demo_packages), "events": events}

@app.post("/demo/block")
async def demo_block():
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

class ScanPlanRequest(BaseModel):
    repo_url: str

@app.post("/scan/plan")
async def create_scan_plan(request: ScanPlanRequest):
    """Generate an AI-powered scan plan for a project"""
    result = await generate_scan_plan(request.repo_url)
    
    if result.get("success") and result.get("plan"):
        # Save to database
        conn = sqlite3.connect(DB_PATH)
        plan_id = await save_scan_plan(conn, result["plan"], request.repo_url)
        conn.close()
        
        # Broadcast to WebSocket clients
        await manager.broadcast({
            "type": "scan_plan_created",
            "plan_id": plan_id,
            "repo_url": request.repo_url,
            "project_name": result["plan"].get("project_name"),
            "risk_level": result["plan"].get("risk_level")
        })
        
        return {
            "success": True,
            "plan_id": plan_id,
            "plan": result["plan"]
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate scan plan"))

@app.get("/scan/plans")
async def list_scan_plans(limit: int = 10):
    """Get recent scan plans"""
    conn = sqlite3.connect(DB_PATH)
    plans = await get_scan_plans(conn, limit)
    conn.close()
    return {"plans": plans}

@app.get("/scan/plan/{plan_id}")
async def get_scan_plan(plan_id: int):
    """Get a specific scan plan"""
    conn = sqlite3.connect(DB_PATH)
    plan = await get_scan_plan_by_id(conn, plan_id)
    conn.close()
    
    if plan:
        return plan
    else:
        raise HTTPException(status_code=404, detail="Scan plan not found")

@app.post("/scan/plan/preview")
async def preview_scan_plan(request: ScanPlanRequest):
    """Preview repo info before generating scan plan"""
    repo_info = await fetch_repo_info(request.repo_url)
    return {
        "repo_info": repo_info,
        "repo_url": request.repo_url
    }

@app.get("/cve/analyze/{package_name}")
async def analyze_cve(package_name: str, version: Optional[str] = None):
    """Analyze a package for known CVEs using OpenAI"""
    cve_data = await analyze_package_cves(package_name, version)
    return cve_data

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
