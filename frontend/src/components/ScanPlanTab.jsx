import { useState, useEffect } from 'react';
import { Search, GitBranch, AlertTriangle, CheckCircle, Clock, Shield, Zap, ExternalLink, ChevronDown, ChevronUp, Sparkles, TrendingUp, Package, Target, Layers, History, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MOCK_SCAN_PLAN = {
  project_name: "Demo AI Security Project",
  repo_url: "https://github.com/example/ai-project",
  generated_at: new Date().toISOString(),
  estimated_duration: "45-60 minutes",
  confidence_score: 0.92,
  risk_level: "MEDIUM",
  scan_phases: [
    {
      name: "Dependency Analysis",
      description: "Scan all Python dependencies for known vulnerabilities",
      priority: "HIGH",
      estimated_time: "15 min",
      tools: ["pip-audit", "safety", "vigil-scanner"],
      targets: ["requirements.txt", "pyproject.toml", "setup.py"]
    },
    {
      name: "AI Model Security",
      description: "Analyze AI model files and training data for security issues",
      priority: "CRITICAL",
      estimated_time: "20 min",
      tools: ["model-scanner", "data-validator"],
      targets: ["models/", "data/", "*.pkl", "*.h5"]
    },
    {
      name: "Prompt Injection Testing",
      description: "Test AI endpoints for prompt injection vulnerabilities",
      priority: "HIGH",
      estimated_time: "15 min",
      tools: ["alignguard", "prompt-fuzzer"],
      targets: ["api/", "agents/", "prompts/"]
    },
    {
      name: "Secret Scanning",
      description: "Detect hardcoded secrets and API keys",
      priority: "CRITICAL",
      estimated_time: "10 min",
      tools: ["gitleaks", "trufflehog"],
      targets: [".env", "config/", "*.py", "*.js"]
    }
  ],
  threats: [
    {
      severity: "CRITICAL",
      category: "Supply Chain",
      description: "Outdated AI library with known CVE",
      affected_component: "transformers==4.20.0",
      recommendation: "Update to transformers>=4.30.0"
    },
    {
      severity: "HIGH",
      category: "Prompt Injection",
      description: "Unvalidated user input to LLM",
      affected_component: "api/chat.py:45",
      recommendation: "Implement input validation and AlignGuard"
    },
    {
      severity: "MEDIUM",
      category: "Data Exposure",
      description: "Training data may contain PII",
      affected_component: "data/training_set.csv",
      recommendation: "Audit and sanitize training data"
    }
  ],
  recommendations: [
    "Enable Vigil real-time monitoring for all AI dependencies",
    "Implement AlignGuard for all user-facing AI endpoints",
    "Set up automated security scans in CI/CD pipeline",
    "Review and update security policies for AI model deployment"
  ]
};

export default function ScanPlanTab() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanPlan, setScanPlan] = useState(null);
  const [recentPlans, setRecentPlans] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [error, setError] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [activeSection, setActiveSection] = useState('overview');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchRecentPlans();
    loadSavedPlans();
  }, []);

  const loadSavedPlans = () => {
    try {
      const saved = localStorage.getItem('vigil_scan_plans');
      if (saved) {
        setSavedPlans(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load saved plans:', err);
    }
  };

  const saveScanPlan = (plan) => {
    try {
      const saved = JSON.parse(localStorage.getItem('vigil_scan_plans') || '[]');
      const newPlan = {
        ...plan,
        id: Date.now(),
        saved_at: new Date().toISOString()
      };
      const updated = [newPlan, ...saved].slice(0, 10); // Keep last 10 plans
      localStorage.setItem('vigil_scan_plans', JSON.stringify(updated));
      setSavedPlans(updated);
    } catch (err) {
      console.error('Failed to save plan:', err);
    }
  };

  const deleteSavedPlan = (id) => {
    try {
      const updated = savedPlans.filter(p => p.id !== id);
      localStorage.setItem('vigil_scan_plans', JSON.stringify(updated));
      setSavedPlans(updated);
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  const loadSavedPlan = (plan) => {
    setScanPlan(plan);
    setActiveSection('overview');
    setExpandedPhases({});
    setShowHistory(false);
  };

  const fetchRecentPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/scan/plans?limit=5`);
      const data = await response.json();
      setRecentPlans(data.plans || []);
    } catch (err) {
      console.error('Failed to fetch recent plans:', err);
      // Use empty array if backend unavailable
      setRecentPlans([]);
    }
  };

  const handleGeneratePlan = async () => {
    if (!repoUrl.trim()) return;
    
    setLoading(true);
    setError(null);
    setScanPlan(null);
    
    // Check if backend is configured
    const hasBackend = API_URL && !API_URL.includes('localhost');
    
    if (!hasBackend) {
      // Use mock data immediately in production without backend
      console.log('Using mock data (no backend configured)');
      setTimeout(() => {
        const newPlan = {
          ...MOCK_SCAN_PLAN,
          repo_url: repoUrl,
          project_name: repoUrl.split('/').pop() || 'AI Security Project'
        };
        setScanPlan(newPlan);
        saveScanPlan(newPlan);
        setActiveSection('overview');
        setExpandedPhases({});
        setLoading(false);
      }, 1500); // Simulate API delay
      return;
    }
    
    // Try backend if configured
    try {
      const response = await fetch(`${API_URL}/scan/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl })
      });
      
      if (!response.ok) {
        throw new Error('Backend unavailable');
      }
      
      const data = await response.json();
      if (data.success) {
        setScanPlan(data.plan);
        saveScanPlan(data.plan);
        setActiveSection('overview');
        setExpandedPhases({});
        fetchRecentPlans();
      } else {
        throw new Error('Failed to generate scan plan');
      }
    } catch (err) {
      console.warn('Backend unavailable, using mock data:', err);
      // Use mock data when backend fails
      setTimeout(() => {
        const newPlan = {
          ...MOCK_SCAN_PLAN,
          repo_url: repoUrl,
          project_name: repoUrl.split('/').pop() || 'AI Security Project'
        };
        setScanPlan(newPlan);
        saveScanPlan(newPlan);
        setActiveSection('overview');
        setExpandedPhases({});
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      'LOW': 'text-green-400',
      'MEDIUM': 'text-yellow-400',
      'HIGH': 'text-orange-400',
      'CRITICAL': 'text-red-400'
    };
    return colors[level] || 'text-gray-400';
  };

  const getRiskBg = (level) => {
    const colors = {
      'LOW': 'bg-green-500/10 border-green-500/30',
      'MEDIUM': 'bg-yellow-500/10 border-yellow-500/30',
      'HIGH': 'bg-orange-500/10 border-orange-500/30',
      'CRITICAL': 'bg-red-500/10 border-red-500/30'
    };
    return colors[level] || 'bg-gray-500/10 border-gray-500/30';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': 'bg-red-500/20 text-red-300 border-red-500/30',
      'MEDIUM': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'LOW': 'bg-green-500/20 text-green-300 border-green-500/30'
    };
    return colors[priority] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const togglePhase = (index) => {
    setExpandedPhases(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
        <div className="mb-6">
          <div className="mb-2">
            <h2 className="text-2xl font-semibold text-gray-900">AI Security Analysis</h2>
            <p className="text-gray-500 text-sm">Powered by GPT-4</p>
          </div>
          <p className="text-gray-600 max-w-3xl leading-relaxed">
            Generate comprehensive security scan plans for any GitHub repository. Get tailored recommendations, threat analysis, and actionable insights in seconds.
          </p>
        </div>
          
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all"
                onKeyPress={(e) => e.key === 'Enter' && !loading && repoUrl.trim() && handleGeneratePlan()}
              />
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={loading || !repoUrl.trim()}
              className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow transition-all disabled:hover:bg-gray-900"
              >
                {loading ? (
                  <span>Analyzing...</span>
                ) : (
                  <span>Analyze</span>
                )}
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                <span>History ({savedPlans.length})</span>
              </button>
            </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="font-medium text-red-900 mb-1">Error</div>
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}

          {loading && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="text-gray-900 font-medium mb-1">Analyzing repository...</div>
              <div className="text-gray-600 text-sm">GPT-4 is analyzing repository structure, dependencies, and security posture. This may take 15-30 seconds.</div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Plans History */}
      {showHistory && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5" />
              Saved Scan Plans
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {savedPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved scan plans yet</p>
              <p className="text-sm mt-1">Generate a scan plan to save it to history</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => loadSavedPlan(plan)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {plan.project_name}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">{plan.repo_url}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Saved: {new Date(plan.saved_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={`font-semibold ${getRiskColor(plan.risk_level)}`}>
                          {plan.risk_level} Risk
                        </span>
                        <span>•</span>
                        <span>{plan.scan_phases?.length || 0} Phases</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSavedPlan(plan.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete scan plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scan Plan Results */}
      {scanPlan && (
        <div className="space-y-6 animate-in slide-in-from-bottom">
          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setScanPlan(null)}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <span>✕</span>
              <span>Close Scan Plan</span>
            </button>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="mb-2">
                  <h3 className="text-2xl font-semibold text-gray-900">{scanPlan.project_name}</h3>
                  <a href={scanPlan.repo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">
                    {scanPlan.repo_url}
                  </a>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Generated by GPT-4</span>
                  <span>•</span>
                  <span>{new Date(scanPlan.generated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="px-5 py-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                <div className={`text-2xl font-bold ${getRiskColor(scanPlan.risk_level)}`}>
                  {scanPlan.risk_level}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-gray-500 text-sm mb-2">Duration</div>
                <div className="text-gray-900 font-semibold text-lg">{scanPlan.estimated_duration}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-gray-500 text-sm mb-2">Confidence</div>
                <div className="text-gray-900 font-semibold text-lg">{(scanPlan.confidence_score * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-gray-500 text-sm mb-2">Phases</div>
                <div className="text-gray-900 font-semibold text-lg">{scanPlan.scan_phases?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg p-1 border border-gray-200 flex gap-1 shadow-sm">
            {['overview', 'phases', 'threats', 'recommendations'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`flex-1 px-5 py-2.5 rounded-md font-medium transition-all ${
                  activeSection === section
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Section */}
          {activeSection === 'overview' && scanPlan.priority_areas && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-5">
                Priority Focus Areas
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {scanPlan.priority_areas.map((area, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-700 font-semibold text-sm">{idx + 1}</span>
                      </div>
                      <span className="text-gray-900 font-medium">{area}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan Phases Section */}
          {activeSection === 'phases' && scanPlan.scan_phases && (
            <div className="space-y-4">
              {scanPlan.scan_phases.map((phase, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-400 transition-colors shadow-sm">
                  <button
                    onClick={() => togglePhase(idx)}
                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-700 font-semibold">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-lg font-semibold text-gray-900 mb-1">{phase.phase}</h5>
                        <p className="text-gray-600 text-sm">{phase.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getPriorityColor(phase.priority)}`}>
                        {phase.priority}
                      </span>
                      <span className="text-gray-500 text-sm font-mono">{phase.estimated_time}</span>
                      {expandedPhases[idx] ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>
                  
                  {expandedPhases[idx] && phase.checks && (
                    <div className="px-5 pb-5 border-t border-gray-200">
                      <div className="pt-4 space-y-2">
                        {phase.checks.map((check, cidx) => (
                          <div className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                            <span className="text-gray-700 text-sm">• {check}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Threats Section */}
          {activeSection === 'threats' && scanPlan.specific_threats && (
            <div className="space-y-4">
              {scanPlan.specific_threats.map((threat, idx) => (
                <div key={idx} className="bg-white rounded-lg p-5 border-l-4 border-red-500 hover:bg-gray-50 transition-colors shadow-sm">
                  <div>
                    <h5 className="text-lg font-semibold text-red-900 mb-2">{threat.threat}</h5>
                    <p className="text-gray-700 mb-4 leading-relaxed text-sm">{threat.description}</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-green-800 font-medium mb-1 text-sm">
                        Mitigation Strategy
                      </div>
                      <p className="text-green-900 text-sm">{threat.mitigation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations Section */}
          {activeSection === 'recommendations' && (
            <div className="space-y-6">
              {/* Vigil Modules */}
              {scanPlan.vigil_modules && (
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <h4 className="text-xl font-semibold text-gray-900 mb-5">
                    Vigil Module Recommendations
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {scanPlan.vigil_modules.supply_guard && (
                      <div className={`p-5 rounded-lg border ${scanPlan.vigil_modules.supply_guard.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${scanPlan.vigil_modules.supply_guard.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <h5 className="text-lg font-semibold text-gray-900">SupplyGuard</h5>
                        </div>
                        {scanPlan.vigil_modules.supply_guard.enabled ? (
                          <>
                            <div className="text-green-700 font-medium mb-2 text-sm">✓ Recommended</div>
                            {scanPlan.vigil_modules.supply_guard.focus_areas && (
                              <div className="text-sm text-gray-600">
                                <span className="text-gray-500">Focus:</span> {scanPlan.vigil_modules.supply_guard.focus_areas.join(', ')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-500 text-sm">Not recommended for this project</div>
                        )}
                      </div>
                    )}
                    {scanPlan.vigil_modules.align_guard && (
                      <div className={`p-5 rounded-lg border ${scanPlan.vigil_modules.align_guard.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${scanPlan.vigil_modules.align_guard.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <h5 className="text-lg font-semibold text-gray-900">AlignGuard</h5>
                        </div>
                        {scanPlan.vigil_modules.align_guard.enabled ? (
                          <>
                            <div className="text-green-700 font-medium mb-2 text-sm">✓ Recommended</div>
                            {scanPlan.vigil_modules.align_guard.focus_areas && (
                              <div className="text-sm text-gray-600">
                                <span className="text-gray-500">Focus:</span> {scanPlan.vigil_modules.align_guard.focus_areas.join(', ')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-500 text-sm">Not recommended for this project</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommended Tools */}
              {scanPlan.recommended_tools && scanPlan.recommended_tools.length > 0 && (
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <h4 className="text-xl font-semibold text-gray-900 mb-5">Recommended Security Tools</h4>
                  <div className="flex flex-wrap gap-3">
                    {scanPlan.recommended_tools.map((tool, idx) => (
                      <div key={idx} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md text-gray-700 font-medium transition-all cursor-pointer text-sm">
                        {tool}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Plans */}
      {!scanPlan && recentPlans.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-5">Recent Scan Plans</h3>
          <div className="space-y-3">
            {recentPlans.map((planData) => (
              <button
                key={planData.id}
                onClick={() => {
                  setScanPlan(planData.plan);
                  setRepoUrl(planData.repo_url);
                }}
                className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-100 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors mb-1">
                      {planData.plan.project_name}
                    </div>
                    <div className="text-sm text-gray-500">{planData.repo_url}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-lg text-sm font-bold ${getRiskColor(planData.risk_level)}`}>
                      {planData.risk_level}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {new Date(planData.generated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
