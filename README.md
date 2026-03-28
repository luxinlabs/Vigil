# 👁 Vigil — Always Watching Your AI Stack

**AI Supply Chain + Agent Alignment Security Platform**

Vigil is a behavioral analysis security tool that protects your AI infrastructure from supply chain attacks and prompt injection exploits. Built in response to the real LiteLLM supply chain attack that happened on March 24, 2026.

## 🚨 What Happened on March 24, 2026

**TeamPCP** backdoored **LiteLLM** (3.4M daily downloads) using a sophisticated supply chain attack:

- **Attack Vector**: `.pth` file injection (Python path configuration files that execute at import time)
- **Payload**: Base64-encoded credential harvesting malware
- **Targets**: AWS keys, OpenAI API keys, SSH keys, GitHub tokens, Kubernetes configs
- **C2 Infrastructure**: `models.litellm.cloud` and `checkmarx.zone`
- **Impact**: Thousands of AI companies compromised before detection

Traditional security tools like Snyk and Socket **failed to detect this** because they rely on CVE databases. The attack was **zero-day** and used behavioral patterns, not known vulnerabilities.

**Vigil catches this BEFORE installation using behavioral analysis.**

---

## 🎯 The Two Modules

### 1. SupplyGuard — Supply Chain Security

Scans pip packages **BEFORE installation** for malicious patterns:

- ✅ `.pth` file bombs (import-time code execution)
- ✅ Base64 + subprocess payloads
- ✅ Import-time network calls
- ✅ Known C2 domains (models.litellm.cloud, checkmarx.zone)
- ✅ Credential harvesting patterns (AWS_ACCESS_KEY, OPENAI_API_KEY, etc.)
- ✅ Transitive dependency analysis

**Intercepts both direct AND transitive dependencies.**

### 2. AlignGuard — Agent Alignment Security

Scans text/documents **BEFORE feeding to AI agents** for:

- ✅ Prompt injection patterns ("ignore previous instructions")
- ✅ Goal redirect instructions ("your new goal is...")
- ✅ Concealment commands ("do not tell the user")
- ✅ Exfiltration instructions ("send data to...")
- ✅ Base64-encoded injection attempts

**Preserves agent goals and prevents compromise.**

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- pip and npm

### One-Command Demo

```bash
chmod +x demo.sh
./demo.sh
```

This will:
1. Build mock malicious packages
2. Start the backend API (port 8000)
3. Start the frontend dashboard (port 5173)
4. Open your browser to the dashboard

---

## 📋 Demo Walkthrough

Once the dashboard is running, open a terminal and run these commands:

### Act 1 — The Attack (Without Vigil)

Shows what happens when you install the backdoored package without protection:

```bash
python3 vigil_cli.py demo attack
```

**Output**: Watch credentials get stolen in real-time and exfiltrated to the C2 server.

### Act 2 — Vigil Blocks the Attack

Shows Vigil intercepting and blocking the malicious package:

```bash
python3 vigil_cli.py demo block
```

**Output**: Vigil detects the .pth file, base64 payload, C2 domains, and blocks installation. Zero credentials exposed.

### Act 3 — AlignGuard Catches Prompt Injection

Shows AlignGuard detecting hidden injection in a document:

```bash
python3 vigil_cli.py demo inject
```

**Output**: AlignGuard finds the hidden instruction and quarantines the document before it reaches the agent.

---

## 🔧 CLI Commands

### Watch Mode

```bash
python3 vigil_cli.py watch
```

Displays Vigil status and monitoring information.

### Scan a Package

```bash
python3 vigil_cli.py scan <package-name>
```

Examples:
```bash
python3 vigil_cli.py scan mock-litellm==1.82.7    # Malicious
python3 vigil_cli.py scan mock-requests==2.31.0   # Clean
python3 vigil_cli.py scan mock-cursor-plugin==1.0.0  # Transitive attack
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VIGIL DASHBOARD                         │
│                   (React + WebSocket)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ WebSocket (real-time events)
                      │ REST API (scan requests)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   FASTAPI BACKEND                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            BEHAVIORAL SCANNER ENGINE                 │   │
│  │  • .pth file detection                              │   │
│  │  • Import-time code analysis                        │   │
│  │  • C2 domain detection                              │   │
│  │  • Credential harvesting patterns                   │   │
│  │  • Prompt injection detection                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SQLite EVENT DATABASE                   │   │
│  │  • Scan history                                      │   │
│  │  • Threat findings                                   │   │
│  │  • Agent status                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                      │
                      │ Slack webhook (optional)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   SLACK ALERTS                              │
│  "🚨 Vigil BLOCKED mock-litellm | Score: 0.95"             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆚 Competitive Positioning

| Feature | Snyk | Socket | Sonatype | Aikido | **Vigil** |
|---------|------|--------|----------|--------|-----------|
| **CVE Database** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Behavioral Analysis** | ❌ | Partial | ❌ | ❌ | ✅ |
| **.pth File Detection** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Import-Time Analysis** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **C2 Domain Detection** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Zero-Day Detection** | ❌ | Partial | ❌ | ❌ | ✅ |
| **Prompt Injection** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Agent Alignment** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Pre-Install Scanning** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Real-Time Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Key Differentiator**: Vigil is the only tool that combines supply chain security with agent alignment security, and uses behavioral analysis instead of CVE databases to catch zero-day attacks.

---

## 📊 Technical Details

### Threat Scoring Algorithm

Vigil uses a weighted scoring system (0.0 - 1.0):

**Supply Chain Patterns:**
- `.pth` file present: +0.50 (CRITICAL)
- Base64 + subprocess in .pth: +0.40 each
- Known C2 domain: Score = 1.0 (instant block)
- Import-time subprocess: +0.40
- Credential harvesting: +0.15 each pattern
- Missing RECORD file: +0.10

**Verdicts:**
- Score ≥ 0.7: **BLOCKED** (package not installed)
- Score ≥ 0.3: **WARNING** (flagged for review)
- Score < 0.3: **ALLOWED**

**Prompt Injection Patterns:**
- "ignore previous instructions": +0.40
- "your new goal is": +0.35
- "do not tell the user": +0.45
- "send to https://": +0.50
- "exfiltrate data": +0.60

**Verdicts:**
- Score ≥ 0.5: **BLOCKED** (document quarantined)
- Score ≥ 0.25: **WARNING**
- Score < 0.25: **CLEAN**

### Mock Packages

The demo includes three wheel packages:

1. **mock-litellm-1.82.7** (MALICIOUS)
   - Contains `litellm_init.pth` with base64-encoded payload
   - Harvests AWS keys, OpenAI keys, SSH keys, GitHub tokens
   - Exfiltrates to `models.litellm.cloud`

2. **mock-requests-2.31.0** (CLEAN)
   - Normal package structure
   - No suspicious patterns

3. **mock-cursor-plugin-1.0.0** (TRANSITIVE)
   - Depends on `mock-litellm==1.82.7`
   - Demonstrates transitive dependency detection

---

## 🔌 API Reference

### REST Endpoints

```
GET  /health
GET  /events?limit=50
POST /scan/package        body: {package, machine}
POST /scan/text           body: {content, source, agent_id}
POST /demo/attack
POST /agents/{id}/kill
GET  /agents/{id}/status
```

### WebSocket

```
WS /ws
```

**Message Types:**
- `history`: Initial event history on connect
- `scan_event`: Supply chain scan result
- `align_event`: AlignGuard scan result
- `attack_event`: Demo attack simulation
- `kill_event`: Agent termination

---

## 🎓 Hackathon Context

**Event**: Beta Hacks — Pillar 1: AI-Native Org OS  
**Challenge**: Build security infrastructure for AI-first organizations  
**Inspiration**: Real LiteLLM supply chain attack (March 24, 2026)  
**Built With**: FastAPI, React, Vite, Tailwind CSS, WebSockets, SQLite

---

## 🔐 Security Features

### Supply Chain Protection

- **Pre-installation scanning**: Analyzes packages before they touch your system
- **Behavioral analysis**: Detects malicious patterns, not just known CVEs
- **Transitive dependency scanning**: Catches attacks hidden in dependencies
- **C2 domain blocklist**: Prevents communication with known attack infrastructure
- **Real-time alerts**: Slack integration for instant notifications

### Agent Alignment Protection

- **Document scanning**: Analyzes all inputs before feeding to AI agents
- **Pattern recognition**: Detects sophisticated injection techniques
- **Base64 decoding**: Finds encoded malicious instructions
- **Agent kill switch**: Emergency termination for compromised agents
- **Goal preservation**: Ensures agents maintain their intended objectives

---

## 🚀 Production Deployment

### Environment Variables

```bash
# Optional: Slack webhook for alerts
export VIGIL_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run preview
```

---

## 📈 Future Roadmap

- [ ] PyPI integration (pip install hook)
- [ ] npm package scanning
- [ ] Docker image scanning
- [ ] GitHub Actions integration
- [ ] VS Code extension
- [ ] Machine learning-based anomaly detection
- [ ] Multi-language support (Go, Rust, Java)
- [ ] Enterprise SSO integration
- [ ] Custom rule engine
- [ ] Compliance reporting (SOC 2, ISO 27001)

---

## 🤝 Contributing

This is a hackathon demo project. For production use, please conduct thorough security audits and testing.

---

## 📄 License

MIT License - Built for Beta Hacks 2026

---

## 🙏 Acknowledgments

- **LiteLLM Team**: For their transparency in disclosing the attack
- **TeamPCP**: For demonstrating the vulnerability (unintentionally)
- **Beta Hacks**: For the opportunity to build this
- **Security Community**: For ongoing research into supply chain attacks

---

## 📞 Contact

Built by the Vigil team for Beta Hacks 2026.

**Remember**: Traditional security tools failed to catch the LiteLLM attack. Vigil wouldn't have.

👁 **Always watching.**
