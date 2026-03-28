"""
CVE Analysis Module
Uses OpenAI to analyze packages for known CVEs and security vulnerabilities
"""

import os
import json
import httpx
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


async def analyze_package_cves(package_name: str, version: Optional[str] = None) -> Dict:
    """
    Analyze a package for known CVEs using OpenAI API
    
    Args:
        package_name: Name of the package (e.g., 'requests', 'litellm')
        version: Optional version string (e.g., '2.31.0')
    
    Returns:
        Dict containing CVE analysis results
    """
    if not OPENAI_API_KEY:
        return {
            "success": False,
            "error": "OPENAI_API_KEY not configured",
            "cves": []
        }
    
    package_str = f"{package_name}=={version}" if version else package_name
    
    prompt = f"""Analyze the Python package '{package_str}' for known CVEs (Common Vulnerabilities and Exposures).

Please provide:
1. List of known CVEs affecting this package/version
2. Severity level for each CVE (CRITICAL, HIGH, MEDIUM, LOW)
3. Brief description of each vulnerability
4. Recommended fix/mitigation

Format your response as JSON with this structure:
{{
  "package": "{package_str}",
  "has_cves": true/false,
  "cve_count": <number>,
  "cves": [
    {{
      "cve_id": "CVE-YYYY-XXXXX",
      "severity": "CRITICAL/HIGH/MEDIUM/LOW",
      "description": "Brief description",
      "affected_versions": "version range",
      "fixed_in": "version number or null",
      "mitigation": "Recommended action"
    }}
  ],
  "overall_risk": "CRITICAL/HIGH/MEDIUM/LOW/NONE",
  "recommendation": "Overall security recommendation"
}}

If no CVEs are found, return has_cves: false and empty cves array."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
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
                            "content": "You are a security expert specializing in CVE analysis for Python packages. Provide accurate, up-to-date CVE information in JSON format."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"OpenAI API error: {response.status_code}",
                    "cves": []
                }
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            cve_data = json.loads(content)
            cve_data["success"] = True
            
            return cve_data
            
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse CVE data: {str(e)}",
            "cves": []
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"CVE analysis failed: {str(e)}",
            "cves": []
        }


def get_cve_summary(cve_data: Dict) -> str:
    """Generate a human-readable summary of CVE analysis"""
    if not cve_data.get("success"):
        return f"CVE analysis unavailable: {cve_data.get('error', 'Unknown error')}"
    
    if not cve_data.get("has_cves"):
        return "No known CVEs found for this package."
    
    cve_count = cve_data.get("cve_count", 0)
    overall_risk = cve_data.get("overall_risk", "UNKNOWN")
    
    summary = f"Found {cve_count} CVE(s) - Overall Risk: {overall_risk}"
    
    cves = cve_data.get("cves", [])
    if cves:
        critical_count = sum(1 for cve in cves if cve.get("severity") == "CRITICAL")
        high_count = sum(1 for cve in cves if cve.get("severity") == "HIGH")
        
        if critical_count > 0:
            summary += f" ({critical_count} CRITICAL"
            if high_count > 0:
                summary += f", {high_count} HIGH)"
            else:
                summary += ")"
        elif high_count > 0:
            summary += f" ({high_count} HIGH)"
    
    return summary
