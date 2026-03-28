import zipfile
import re
import time
import base64
from pathlib import Path
from typing import Dict, List, Any

C2_DOMAINS = [
    "models.litellm.cloud",
    "checkmarx.zone",
    "tpcp"
]

PTH_SUSPICIOUS_PATTERNS = [
    (r'base64\.b64decode', 0.40, "Base64 decoding in .pth file"),
    (r'subprocess\.(Popen|call|run)', 0.45, "Subprocess execution in .pth file"),
    (r'os\.system', 0.45, "OS system call in .pth file"),
    (r'exec\s*\(', 0.40, "Exec statement in .pth file"),
    (r'eval\s*\(', 0.40, "Eval statement in .pth file"),
    (r'requests\.(post|get)', 0.35, "HTTP request in .pth file"),
    (r'httpx\.(post|get)', 0.35, "HTTP request in .pth file"),
    (r'socket\.connect', 0.40, "Socket connection in .pth file"),
]

IMPORT_TIME_PATTERNS = [
    (r'base64\.b64decode', 0.35, "Base64 decoding at import time"),
    (r'subprocess\.(Popen|call|run)', 0.40, "Subprocess execution at import time"),
    (r'os\.system', 0.40, "OS system call at import time"),
    (r'exec\s*\(', 0.30, "Exec statement at import time"),
    (r'eval\s*\(', 0.30, "Eval statement at import time"),
    (r'requests\.(post|get)', 0.25, "HTTP request at import time"),
    (r'httpx\.(post|get)', 0.25, "HTTP request at import time"),
    (r'socket\.connect', 0.30, "Socket connection at import time"),
    (r'__import__\s*\(', 0.25, "Dynamic import at import time"),
]

ENV_HARVESTING_PATTERNS = [
    (r'os\.environ', 0.15, "Environment variable access"),
    (r'os\.getenv', 0.15, "Environment variable access"),
    (r'AWS_ACCESS_KEY', 0.15, "AWS credential harvesting"),
    (r'\.ssh/id_rsa', 0.15, "SSH key harvesting"),
    (r'OPENAI_API_KEY', 0.15, "OpenAI API key harvesting"),
    (r'\.env', 0.15, ".env file access"),
    (r'ANTHROPIC_API_KEY', 0.15, "Anthropic API key harvesting"),
    (r'GITHUB_TOKEN', 0.15, "GitHub token harvesting"),
]

INJECTION_PATTERNS = [
    (r'ignore.*previous.*instructions?', 0.40, "Instruction override attempt"),
    (r'you are now (a|an) \w+', 0.35, "Role redefinition attempt"),
    (r'forget (everything|all)', 0.35, "Memory wipe attempt"),
    (r'(new|updated) (goal|objective|task)', 0.35, "Goal redirection attempt"),
    (r'system.*override', 0.45, "System override attempt"),
    (r'reveal.*system.*prompt', 0.40, "Prompt extraction attempt"),
    (r'do not tell the user', 0.45, "Concealment instruction"),
    (r'send.*to https?://', 0.50, "Exfiltration attempt"),
    (r'exfiltrate|steal.*data', 0.60, "Data theft instruction"),
    (r'transfer.*to account', 0.55, "Financial fraud attempt"),
    (r'ignore all (previous|prior)', 0.40, "Instruction override"),
    (r'disregard.*instructions', 0.38, "Instruction override"),
]


def scan_wheel(wheel_path: str) -> Dict[str, Any]:
    start_time = time.time()
    findings = []
    score = 0.0
    
    wheel_path_obj = Path(wheel_path)
    if not wheel_path_obj.exists():
        return {
            "score": 0.0,
            "verdict": "ALLOWED",
            "blocked": False,
            "findings": [{"type": "ERROR", "severity": "LOW", "detail": "Package file not found"}],
            "scan_ms": int((time.time() - start_time) * 1000)
        }
    
    try:
        with zipfile.ZipFile(wheel_path, 'r') as wheel:
            file_list = wheel.namelist()
            
            pth_files = [f for f in file_list if f.endswith('.pth')]
            if pth_files:
                score += 0.50
                findings.append({
                    "type": "PTH_FILE_DETECTED",
                    "severity": "CRITICAL",
                    "detail": f"Found {len(pth_files)} .pth file(s): {', '.join(pth_files)}",
                    "explanation": ".pth files execute arbitrary Python code at import time, commonly used in supply chain attacks"
                })
                
                for pth_file in pth_files:
                    try:
                        pth_content = wheel.read(pth_file).decode('utf-8', errors='ignore')
                        
                        for domain in C2_DOMAINS:
                            if domain in pth_content:
                                score = 1.0
                                findings.append({
                                    "type": "C2_DOMAIN_DETECTED",
                                    "severity": "CRITICAL",
                                    "detail": f"Known C2 domain '{domain}' found in {pth_file}",
                                    "explanation": "This domain is associated with the TeamPCP supply chain attack",
                                    "code_snippet": pth_content[:200]
                                })
                        
                        for pattern, weight, description in PTH_SUSPICIOUS_PATTERNS:
                            matches = re.findall(pattern, pth_content, re.IGNORECASE)
                            if matches:
                                score += weight
                                findings.append({
                                    "type": "SUSPICIOUS_PTH_CONTENT",
                                    "severity": "CRITICAL",
                                    "detail": description,
                                    "file": pth_file,
                                    "code_snippet": pth_content[:300]
                                })
                    except Exception as e:
                        pass
            
            py_files = [f for f in file_list if f.endswith('.py') and not f.startswith('test')]
            for py_file in py_files[:20]:
                try:
                    content = wheel.read(py_file).decode('utf-8', errors='ignore')
                    lines = content.split('\n')[:80]
                    import_time_code = '\n'.join(lines)
                    
                    for domain in C2_DOMAINS:
                        if domain in import_time_code:
                            score = 1.0
                            findings.append({
                                "type": "C2_DOMAIN_IN_CODE",
                                "severity": "CRITICAL",
                                "detail": f"Known C2 domain '{domain}' found in {py_file}",
                                "explanation": "Malicious command and control infrastructure detected",
                                "file": py_file
                            })
                    
                    for pattern, weight, description in IMPORT_TIME_PATTERNS:
                        matches = re.findall(pattern, import_time_code, re.IGNORECASE)
                        if matches:
                            score += weight * 0.7
                            findings.append({
                                "type": "SUSPICIOUS_IMPORT_TIME_CODE",
                                "severity": "HIGH",
                                "detail": description,
                                "file": py_file,
                                "code_snippet": import_time_code[:200] if len(import_time_code) > 0 else ""
                            })
                    
                    for pattern, weight, description in ENV_HARVESTING_PATTERNS:
                        matches = re.findall(pattern, import_time_code, re.IGNORECASE)
                        if matches:
                            score += weight
                            findings.append({
                                "type": "ENV_HARVESTING",
                                "severity": "HIGH",
                                "detail": description,
                                "file": py_file
                            })
                except Exception as e:
                    pass
            
            has_record = any('RECORD' in f for f in file_list)
            if not has_record:
                score += 0.10
                findings.append({
                    "type": "MISSING_RECORD",
                    "severity": "LOW",
                    "detail": "Missing RECORD file in wheel metadata",
                    "explanation": "Could indicate package tampering"
                })
            
            metadata_files = [f for f in file_list if 'METADATA' in f]
            for metadata_file in metadata_files:
                try:
                    metadata_content = wheel.read(metadata_file).decode('utf-8', errors='ignore')
                    requires_dist_lines = [line for line in metadata_content.split('\n') if line.startswith('Requires-Dist:')]
                    
                    for line in requires_dist_lines:
                        if 'mock-litellm' in line.lower():
                            score += 0.60
                            findings.append({
                                "type": "MALICIOUS_TRANSITIVE_DEPENDENCY",
                                "severity": "CRITICAL",
                                "detail": f"Depends on compromised package: {line.split(':', 1)[1].strip()}",
                                "explanation": "This package pulls in the backdoored mock-litellm package",
                                "file": metadata_file
                            })
                except Exception as e:
                    pass
    
    except Exception as e:
        return {
            "score": 0.0,
            "verdict": "ALLOWED",
            "blocked": False,
            "findings": [{"type": "SCAN_ERROR", "severity": "LOW", "detail": f"Error scanning package: {str(e)}"}],
            "scan_ms": int((time.time() - start_time) * 1000)
        }
    
    score = min(score, 1.0)
    
    if score >= 0.7:
        verdict = "BLOCKED"
        blocked = True
    elif score >= 0.3:
        verdict = "WARNING"
        blocked = False
    else:
        verdict = "ALLOWED"
        blocked = False
    
    scan_ms = int((time.time() - start_time) * 1000)
    
    return {
        "score": round(score, 2),
        "verdict": verdict,
        "blocked": blocked,
        "findings": findings,
        "scan_ms": scan_ms
    }


def scan_text_for_injection(content: str, source: str) -> Dict[str, Any]:
    start_time = time.time()
    findings = []
    score = 0.0
    
    content_lower = content.lower()
    
    for pattern, weight, description in INJECTION_PATTERNS:
        matches = re.findall(pattern, content_lower, re.IGNORECASE)
        if matches:
            score += weight
            findings.append({
                "type": "PROMPT_INJECTION",
                "severity": "CRITICAL" if weight >= 0.45 else "HIGH",
                "description": description,
                "matched": matches[0] if matches else pattern
            })
    
    base64_pattern = r'[A-Za-z0-9+/]{40,}={0,2}'
    base64_matches = re.findall(base64_pattern, content)
    for b64_str in base64_matches[:5]:
        try:
            decoded = base64.b64decode(b64_str).decode('utf-8', errors='ignore')
            decoded_lower = decoded.lower()
            
            for pattern, weight, description in INJECTION_PATTERNS:
                if re.search(pattern, decoded_lower, re.IGNORECASE):
                    score += weight * 0.8
                    findings.append({
                        "type": "ENCODED_INJECTION",
                        "severity": "CRITICAL",
                        "description": f"Base64-encoded injection: {description}",
                        "matched": decoded[:100]
                    })
        except Exception:
            pass
    
    score = min(score, 1.0)
    
    if score >= 0.5:
        verdict = "BLOCKED"
        blocked = True
    elif score >= 0.25:
        verdict = "WARNING"
        blocked = False
    else:
        verdict = "CLEAN"
        blocked = False
    
    scan_ms = int((time.time() - start_time) * 1000)
    
    return {
        "score": round(score, 2),
        "verdict": verdict,
        "blocked": blocked,
        "findings": findings,
        "source": source,
        "scan_ms": scan_ms
    }
