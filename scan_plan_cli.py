#!/usr/bin/env python3
"""
Vigil Scan Plan Generator CLI
Generate AI-powered security scan plans for projects
"""

import sys
import httpx
import json
import time
from typing import Optional

try:
    from colorama import Fore, Style, init
    init(autoreset=True)
except ImportError:
    class Fore:
        RED = GREEN = YELLOW = CYAN = MAGENTA = WHITE = BLUE = RESET = ""
    class Style:
        BRIGHT = DIM = RESET_ALL = ""

BACKEND_URL = "http://localhost:8000"


def print_header():
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}{'═' * 70}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}   👁  Vigil Scan Plan Generator{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}{'═' * 70}{Style.RESET_ALL}\n")


def print_repo_info(repo_info: dict):
    """Display repository information"""
    print(f"{Fore.CYAN}Repository Information:{Style.RESET_ALL}")
    print(f"{Fore.WHITE}  Name: {repo_info.get('name', 'Unknown')}{Style.RESET_ALL}")
    print(f"{Fore.WHITE}  Description: {repo_info.get('description', 'No description')}{Style.RESET_ALL}")
    print(f"{Fore.WHITE}  Language: {repo_info.get('language', 'Unknown')}{Style.RESET_ALL}")
    print(f"{Fore.WHITE}  Stars: {repo_info.get('stars', 0)}{Style.RESET_ALL}")
    print(f"{Fore.WHITE}  Size: {repo_info.get('size', 0)} KB{Style.RESET_ALL}")
    if repo_info.get('topics'):
        print(f"{Fore.WHITE}  Topics: {', '.join(repo_info['topics'])}{Style.RESET_ALL}")
    print()


def print_scan_plan(plan: dict):
    """Display the generated scan plan"""
    print(f"\n{Fore.GREEN}{Style.BRIGHT}{'═' * 70}{Style.RESET_ALL}")
    print(f"{Fore.GREEN}{Style.BRIGHT}   ✓ Scan Plan Generated{Style.RESET_ALL}")
    print(f"{Fore.GREEN}{Style.BRIGHT}{'═' * 70}{Style.RESET_ALL}\n")
    
    # Project info
    print(f"{Fore.CYAN}{Style.BRIGHT}Project: {plan.get('project_name', 'Unknown')}{Style.RESET_ALL}")
    
    # Risk level with color coding
    risk_level = plan.get('risk_level', 'UNKNOWN')
    risk_colors = {
        'LOW': Fore.GREEN,
        'MEDIUM': Fore.YELLOW,
        'HIGH': Fore.RED,
        'CRITICAL': Fore.RED + Style.BRIGHT
    }
    risk_color = risk_colors.get(risk_level, Fore.WHITE)
    print(f"{Fore.WHITE}Risk Level: {risk_color}{risk_level}{Style.RESET_ALL}")
    print(f"{Fore.WHITE}Estimated Duration: {plan.get('estimated_duration', 'Unknown')}{Style.RESET_ALL}")
    print(f"{Fore.WHITE}Confidence Score: {plan.get('confidence_score', 0.0):.2f}{Style.RESET_ALL}\n")
    
    # Priority areas
    if plan.get('priority_areas'):
        print(f"{Fore.CYAN}Priority Areas:{Style.RESET_ALL}")
        for area in plan['priority_areas']:
            print(f"{Fore.WHITE}  • {area}{Style.RESET_ALL}")
        print()
    
    # Scan phases
    if plan.get('scan_phases'):
        print(f"{Fore.CYAN}{Style.BRIGHT}Scan Phases:{Style.RESET_ALL}\n")
        for i, phase in enumerate(plan['scan_phases'], 1):
            priority_color = {
                'HIGH': Fore.RED,
                'MEDIUM': Fore.YELLOW,
                'LOW': Fore.GREEN
            }.get(phase.get('priority', 'MEDIUM'), Fore.WHITE)
            
            print(f"{Fore.YELLOW}Phase {i}: {phase.get('phase', 'Unknown')}{Style.RESET_ALL}")
            print(f"{Fore.WHITE}  Description: {phase.get('description', '')}{Style.RESET_ALL}")
            print(f"{Fore.WHITE}  Priority: {priority_color}{phase.get('priority', 'MEDIUM')}{Style.RESET_ALL}")
            print(f"{Fore.WHITE}  Estimated Time: {phase.get('estimated_time', 'Unknown')}{Style.RESET_ALL}")
            
            if phase.get('checks'):
                print(f"{Fore.WHITE}  Checks:{Style.RESET_ALL}")
                for check in phase['checks'][:5]:  # Show first 5 checks
                    print(f"{Style.DIM}    - {check}{Style.RESET_ALL}")
                if len(phase['checks']) > 5:
                    print(f"{Style.DIM}    ... and {len(phase['checks']) - 5} more{Style.RESET_ALL}")
            print()
    
    # Specific threats
    if plan.get('specific_threats'):
        print(f"{Fore.RED}{Style.BRIGHT}Specific Threats:{Style.RESET_ALL}\n")
        for threat in plan['specific_threats'][:3]:  # Show first 3 threats
            print(f"{Fore.RED}  ⚠  {threat.get('threat', 'Unknown')}{Style.RESET_ALL}")
            print(f"{Fore.WHITE}     {threat.get('description', '')}{Style.RESET_ALL}")
            print(f"{Fore.GREEN}     Mitigation: {threat.get('mitigation', '')}{Style.RESET_ALL}")
            print()
    
    # Vigil modules
    if plan.get('vigil_modules'):
        print(f"{Fore.MAGENTA}Vigil Module Recommendations:{Style.RESET_ALL}")
        
        supply_guard = plan['vigil_modules'].get('supply_guard', {})
        if supply_guard.get('enabled'):
            print(f"{Fore.GREEN}  ✓ SupplyGuard: ENABLED{Style.RESET_ALL}")
            if supply_guard.get('focus_areas'):
                print(f"{Fore.WHITE}    Focus: {', '.join(supply_guard['focus_areas'])}{Style.RESET_ALL}")
        else:
            print(f"{Fore.YELLOW}  ○ SupplyGuard: Not recommended{Style.RESET_ALL}")
        
        align_guard = plan['vigil_modules'].get('align_guard', {})
        if align_guard.get('enabled'):
            print(f"{Fore.GREEN}  ✓ AlignGuard: ENABLED{Style.RESET_ALL}")
            if align_guard.get('focus_areas'):
                print(f"{Fore.WHITE}    Focus: {', '.join(align_guard['focus_areas'])}{Style.RESET_ALL}")
        else:
            print(f"{Fore.YELLOW}  ○ AlignGuard: Not recommended{Style.RESET_ALL}")
        print()
    
    # Recommended tools
    if plan.get('recommended_tools'):
        print(f"{Fore.CYAN}Recommended Tools:{Style.RESET_ALL}")
        for tool in plan['recommended_tools']:
            print(f"{Fore.WHITE}  • {tool}{Style.RESET_ALL}")
        print()


def generate_plan(repo_url: str):
    """Generate a scan plan for a repository"""
    print_header()
    
    print(f"{Fore.CYAN}Repository URL: {Fore.WHITE}{repo_url}{Style.RESET_ALL}\n")
    
    # Step 1: Preview repo info
    print(f"{Fore.YELLOW}Step 1: Fetching repository information...{Style.RESET_ALL}")
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(f"{BACKEND_URL}/scan/plan/preview", json={"repo_url": repo_url})
            
            if response.status_code == 200:
                data = response.json()
                repo_info = data.get('repo_info', {})
                print_repo_info(repo_info)
            else:
                print(f"{Fore.RED}Failed to fetch repository info: {response.status_code}{Style.RESET_ALL}")
                return
    except Exception as e:
        print(f"{Fore.RED}Error: {str(e)}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Make sure the backend is running: cd backend && uvicorn main:app --reload{Style.RESET_ALL}")
        return
    
    # Step 2: Generate scan plan
    print(f"{Fore.YELLOW}Step 2: Generating AI-powered scan plan...{Style.RESET_ALL}")
    print(f"{Style.DIM}(This may take 10-30 seconds){Style.RESET_ALL}\n")
    
    start_time = time.time()
    
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(f"{BACKEND_URL}/scan/plan", json={"repo_url": repo_url})
            
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    plan = data.get('plan', {})
                    plan_id = data.get('plan_id')
                    
                    print(f"{Fore.GREEN}✓ Plan generated in {elapsed:.1f}s (ID: {plan_id}){Style.RESET_ALL}")
                    print_scan_plan(plan)
                    
                    # Save to file
                    filename = f"scan_plan_{plan_id}.json"
                    with open(filename, 'w') as f:
                        json.dump(plan, f, indent=2)
                    
                    print(f"{Fore.GREEN}✓ Scan plan saved to: {filename}{Style.RESET_ALL}\n")
                    print(f"{Fore.CYAN}View in dashboard: http://localhost:5173{Style.RESET_ALL}\n")
                else:
                    print(f"{Fore.RED}Failed to generate plan{Style.RESET_ALL}")
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                print(f"{Fore.RED}Error: {error_detail}{Style.RESET_ALL}")
                
                if "OPENAI_API_KEY" in error_detail:
                    print(f"\n{Fore.YELLOW}To use this feature:{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}1. Get an OpenAI API key from https://platform.openai.com{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}2. Set environment variable: export OPENAI_API_KEY='your-key'{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}3. Restart the backend{Style.RESET_ALL}\n")
    
    except Exception as e:
        print(f"{Fore.RED}Error: {str(e)}{Style.RESET_ALL}")


def list_plans():
    """List recent scan plans"""
    print_header()
    
    print(f"{Fore.CYAN}Recent Scan Plans:{Style.RESET_ALL}\n")
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{BACKEND_URL}/scan/plans?limit=10")
            
            if response.status_code == 200:
                data = response.json()
                plans = data.get('plans', [])
                
                if not plans:
                    print(f"{Fore.YELLOW}No scan plans found. Generate one with:{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}  python3 scan_plan_cli.py <repo-url>{Style.RESET_ALL}\n")
                    return
                
                for plan_data in plans:
                    plan = plan_data.get('plan', {})
                    risk_color = {
                        'LOW': Fore.GREEN,
                        'MEDIUM': Fore.YELLOW,
                        'HIGH': Fore.RED,
                        'CRITICAL': Fore.RED + Style.BRIGHT
                    }.get(plan.get('risk_level', 'UNKNOWN'), Fore.WHITE)
                    
                    print(f"{Fore.CYAN}ID {plan_data['id']}: {plan.get('project_name', 'Unknown')}{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}  URL: {plan_data['repo_url']}{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}  Risk: {risk_color}{plan.get('risk_level', 'UNKNOWN')}{Style.RESET_ALL}")
                    print(f"{Fore.WHITE}  Generated: {plan_data.get('generated_at', 'Unknown')}{Style.RESET_ALL}")
                    print()
            else:
                print(f"{Fore.RED}Failed to fetch plans: {response.status_code}{Style.RESET_ALL}")
    
    except Exception as e:
        print(f"{Fore.RED}Error: {str(e)}{Style.RESET_ALL}")


def main():
    if len(sys.argv) < 2:
        print(f"\n{Fore.CYAN}Usage:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}  Generate scan plan:{Style.RESET_ALL}")
        print(f"    python3 scan_plan_cli.py <repo-url>")
        print(f"    python3 scan_plan_cli.py https://github.com/owner/repo\n")
        print(f"{Fore.WHITE}  List recent plans:{Style.RESET_ALL}")
        print(f"    python3 scan_plan_cli.py list\n")
        print(f"{Fore.YELLOW}Note: Requires OPENAI_API_KEY environment variable{Style.RESET_ALL}\n")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        list_plans()
    else:
        # Treat as repo URL
        repo_url = command
        generate_plan(repo_url)


if __name__ == "__main__":
    main()
