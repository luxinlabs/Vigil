"""
AI-Powered Scan Plan Generator
Uses OpenAI to analyze projects and create customized security scan plans
"""

import os
import json
import httpx
from typing import Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


async def fetch_repo_info(repo_url: str) -> Dict:
    """Fetch basic repository information from GitHub"""
    # Extract owner and repo from URL
    # e.g., https://github.com/owner/repo -> owner/repo
    parts = repo_url.rstrip('/').split('/')
    if 'github.com' in repo_url:
        owner, repo = parts[-2], parts[-1]
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(api_url, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "name": data.get("name"),
                        "description": data.get("description"),
                        "language": data.get("language"),
                        "languages_url": data.get("languages_url"),
                        "size": data.get("size"),
                        "stars": data.get("stargazers_count"),
                        "forks": data.get("forks_count"),
                        "topics": data.get("topics", []),
                        "has_issues": data.get("has_issues"),
                        "open_issues": data.get("open_issues_count"),
                        "default_branch": data.get("default_branch"),
                        "created_at": data.get("created_at"),
                        "updated_at": data.get("updated_at"),
                    }
            except Exception as e:
                print(f"Error fetching repo info: {e}")
    
    return {
        "name": repo_url.split('/')[-1],
        "description": "Unknown",
        "language": "Unknown"
    }


async def fetch_repo_languages(languages_url: str) -> Dict[str, int]:
    """Fetch language breakdown from GitHub"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(languages_url, timeout=10.0)
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
    return {}


async def generate_scan_plan(repo_url: str, repo_info: Optional[Dict] = None) -> Dict:
    """Generate a customized scan plan using OpenAI"""
    
    if not OPENAI_API_KEY:
        return {
            "error": "OPENAI_API_KEY not set",
            "plan": None
        }
    
    # Fetch repo info if not provided
    if not repo_info:
        repo_info = await fetch_repo_info(repo_url)
    
    # Fetch language breakdown
    languages = {}
    if repo_info.get("languages_url"):
        languages = await fetch_repo_languages(repo_info["languages_url"])
    
    # Build context for OpenAI
    context = f"""
Project: {repo_info.get('name', 'Unknown')}
Description: {repo_info.get('description', 'No description')}
Primary Language: {repo_info.get('language', 'Unknown')}
Languages: {', '.join(languages.keys()) if languages else 'Unknown'}
Topics: {', '.join(repo_info.get('topics', [])) if repo_info.get('topics') else 'None'}
Size: {repo_info.get('size', 0)} KB
Stars: {repo_info.get('stars', 0)}
Open Issues: {repo_info.get('open_issues', 0)}
"""

    prompt = f"""You are a security expert analyzing a software project for potential vulnerabilities. Based on the project information below, create a comprehensive security scan plan.

{context}

Generate a detailed scan plan in JSON format with the following structure:
{{
  "project_name": "project name",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "priority_areas": ["area1", "area2", ...],
  "scan_phases": [
    {{
      "phase": "Phase name",
      "description": "What to scan",
      "checks": ["check1", "check2", ...],
      "estimated_time": "time estimate",
      "priority": "HIGH|MEDIUM|LOW"
    }}
  ],
  "specific_threats": [
    {{
      "threat": "threat name",
      "description": "why this is a concern",
      "mitigation": "how to address it"
    }}
  ],
  "recommended_tools": ["tool1", "tool2", ...],
  "vigil_modules": {{
    "supply_guard": {{
      "enabled": true/false,
      "focus_areas": ["area1", "area2"]
    }},
    "align_guard": {{
      "enabled": true/false,
      "focus_areas": ["area1", "area2"]
    }}
  }},
  "estimated_duration": "total time estimate",
  "confidence_score": 0.0-1.0
}}

Focus on:
1. Supply chain security (dependencies, packages)
2. AI/ML security if applicable (prompt injection, model security)
3. Code vulnerabilities specific to the language/framework
4. Third-party integrations and APIs
5. Data handling and privacy concerns

Be specific and actionable. Return ONLY valid JSON, no additional text."""

    # Call OpenAI API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a cybersecurity expert specializing in software supply chain security and AI security. You provide detailed, actionable security scan plans."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                # Parse JSON from response
                try:
                    # Remove markdown code blocks if present
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()
                    
                    plan = json.loads(content)
                    
                    # Add metadata
                    plan["repo_url"] = repo_url
                    plan["repo_info"] = repo_info
                    plan["languages"] = languages
                    plan["generated_at"] = datetime.utcnow().isoformat()
                    plan["model"] = "gpt-4"
                    
                    return {
                        "success": True,
                        "plan": plan
                    }
                except json.JSONDecodeError as e:
                    return {
                        "error": f"Failed to parse OpenAI response: {str(e)}",
                        "raw_response": content,
                        "plan": None
                    }
            else:
                return {
                    "error": f"OpenAI API error: {response.status_code}",
                    "details": response.text,
                    "plan": None
                }
                
        except Exception as e:
            return {
                "error": f"Failed to generate scan plan: {str(e)}",
                "plan": None
            }


async def save_scan_plan(db_conn, plan: Dict, repo_url: str):
    """Save scan plan to database"""
    cursor = db_conn.cursor()
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
    
    cursor.execute("""
        INSERT INTO scan_plans (repo_url, project_name, risk_level, plan_json, generated_at, model)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        repo_url,
        plan.get("project_name"),
        plan.get("risk_level"),
        json.dumps(plan),
        plan.get("generated_at"),
        plan.get("model", "gpt-4")
    ))
    
    db_conn.commit()
    return cursor.lastrowid


async def get_scan_plans(db_conn, limit: int = 10):
    """Retrieve recent scan plans"""
    cursor = db_conn.cursor()
    cursor.execute("""
        SELECT id, repo_url, project_name, risk_level, plan_json, generated_at, model
        FROM scan_plans
        ORDER BY generated_at DESC
        LIMIT ?
    """, (limit,))
    
    plans = []
    for row in cursor.fetchall():
        plans.append({
            "id": row[0],
            "repo_url": row[1],
            "project_name": row[2],
            "risk_level": row[3],
            "plan": json.loads(row[4]),
            "generated_at": row[5],
            "model": row[6]
        })
    
    return plans


async def get_scan_plan_by_id(db_conn, plan_id: int):
    """Retrieve a specific scan plan"""
    cursor = db_conn.cursor()
    cursor.execute("""
        SELECT id, repo_url, project_name, risk_level, plan_json, generated_at, model
        FROM scan_plans
        WHERE id = ?
    """, (plan_id,))
    
    row = cursor.fetchone()
    if row:
        return {
            "id": row[0],
            "repo_url": row[1],
            "project_name": row[2],
            "risk_level": row[3],
            "plan": json.loads(row[4]),
            "generated_at": row[5],
            "model": row[6]
        }
    return None
