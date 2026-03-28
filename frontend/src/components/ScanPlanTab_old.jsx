import { useState, useEffect } from 'react';
import { Search, GitBranch, AlertTriangle, CheckCircle, Clock, Shield, Zap, ExternalLink, ChevronDown, ChevronUp, Sparkles, TrendingUp, Package } from 'lucide-react';

export default function ScanPlanTab() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [repoInfo, setRepoInfo] = useState(null);
  const [scanPlan, setScanPlan] = useState(null);
  const [recentPlans, setRecentPlans] = useState([]);
  const [error, setError] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [showRecentPlans, setShowRecentPlans] = useState(true);

  useEffect(() => {
    fetchRecentPlans();
  }, []);

  const fetchRecentPlans = async () => {
    try {
      const response = await fetch('http://localhost:8000/scan/plans?limit=5');
      const data = await response.json();
      setRecentPlans(data.plans || []);
    } catch (err) {
      console.error('Failed to fetch recent plans:', err);
    }
  };

  const handlePreview = async () => {
    if (!repoUrl.trim()) return;
    
    setLoading(true);
    setError(null);
    setRepoInfo(null);
    
    try {
      const response = await fetch('http://localhost:8000/scan/plan/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl })
      });
      
      const data = await response.json();
      setRepoInfo(data.repo_info);
    } catch (err) {
      setError('Failed to fetch repository info. Make sure the URL is valid.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!repoUrl.trim()) return;
    
    setLoading(true);
    setError(null);
    setScanPlan(null);
    
    try {
      const response = await fetch('http://localhost:8000/scan/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate scan plan');
      }
      
      const data = await response.json();
      if (data.success) {
        setScanPlan(data.plan);
        fetchRecentPlans();
      } else {
        setError('Failed to generate scan plan');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate scan plan. Make sure OPENAI_API_KEY is set.');
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

  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': 'bg-red-500/20 text-red-400',
      'MEDIUM': 'bg-yellow-500/20 text-yellow-400',
      'LOW': 'bg-green-500/20 text-green-400'
    };
    return colors[priority] || 'bg-gray-500/20 text-gray-400';
  };

  const togglePhase = (index) => {
    setExpandedPhases(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-vigil-purple/20 via-slate-800/50 to-slate-800/50 rounded-xl p-8 border border-vigil-purple/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-vigil-purple/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-vigil-purple/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-vigil-purple" />
            </div>
            <h2 className="text-2xl font-bold text-white">AI-Powered Security Analysis</h2>
          </div>
          <p className="text-gray-400 mb-6 max-w-2xl">Generate comprehensive security scan plans for any GitHub repository using GPT-4. Get tailored recommendations, threat analysis, and actionable insights in seconds.</p>
          
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <GitBranch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="Paste GitHub repository URL (e.g., https://github.com/openai/openai-python)"
                  className="w-full bg-slate-900/80 backdrop-blur border border-slate-600 rounded-lg pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-vigil-purple focus:ring-2 focus:ring-vigil-purple/20 transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && !loading && repoUrl.trim() && handleGeneratePlan()}
                />
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={loading || !repoUrl.trim()}
                className="px-8 py-3.5 bg-vigil-purple hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg shadow-vigil-purple/20 hover:shadow-vigil-purple/40 transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Generate Plan</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-start gap-3 animate-in slide-in-from-top">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium mb-1">Analysis Failed</div>
                  <div className="text-red-300/80">{error}</div>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-vigil-purple/10 border border-vigil-purple/30 rounded-lg p-4 flex items-center gap-3 animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-8 w-8 border-3 border-vigil-purple border-t-transparent"></div>
                    <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-vigil-purple" />
                  </div>
                  <div>
                    <div className="text-white font-medium">AI Analysis in Progress</div>
                    <div className="text-gray-400 text-sm">GPT-4 is analyzing the repository structure, dependencies, and security posture...</div>
                  </div>
                </div>
                <div className="text-gray-500 text-sm">~15-30s</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repository Info Card */}
      {repoInfo && !scanPlan && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 animate-in slide-in-from-bottom">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-vigil-purple" />
              <h3 className="text-lg font-bold text-white">Repository Preview</h3>
            </div>
            <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="text-vigil-purple hover:text-purple-400 flex items-center gap-1 text-sm">
              <span>View on GitHub</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-gray-400 text-xs mb-1">Repository</div>
              <div className="text-white font-semibold text-lg">{repoInfo.name}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-gray-400 text-xs mb-1">Language</div>
              <div className="text-white font-semibold text-lg">{repoInfo.language || 'Multiple'}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-gray-400 text-xs mb-1">Stars</div>
              <div className="text-white font-semibold text-lg flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                {repoInfo.stars?.toLocaleString() || 0}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-gray-400 text-xs mb-1">Size</div>
              <div className="text-white font-semibold text-lg">{(repoInfo.size / 1024).toFixed(1)} MB</div>
            </div>
          </div>
          {repoInfo.description && (
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">{repoInfo.description}</p>
          )}
        </div>
      )}

      {/* Scan Plan */}
      {scanPlan && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white">{scanPlan.project_name}</h3>
                <p className="text-gray-400 mt-1">Generated by GPT-4</p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getRiskColor(scanPlan.risk_level)}`}>
                  {scanPlan.risk_level} RISK
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Confidence: {(scanPlan.confidence_score * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{scanPlan.estimated_duration}</span>
              </div>
            </div>
          </div>

          {/* Priority Areas */}
          {scanPlan.priority_areas && scanPlan.priority_areas.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-bold text-white mb-3">Priority Areas</h4>
              <div className="flex flex-wrap gap-2">
                {scanPlan.priority_areas.map((area, idx) => (
                  <span key={idx} className="px-3 py-1 bg-vigil-purple/20 text-vigil-purple rounded-full text-sm">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scan Phases */}
          {scanPlan.scan_phases && scanPlan.scan_phases.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-bold text-white mb-4">Scan Phases</h4>
              <div className="space-y-4">
                {scanPlan.scan_phases.map((phase, idx) => (
                  <div key={idx} className="border border-slate-600 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-bold text-white">Phase {idx + 1}: {phase.phase}</h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(phase.priority)}`}>
                        {phase.priority}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{phase.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span>⏱ {phase.estimated_time}</span>
                      <span>✓ {phase.checks?.length || 0} checks</span>
                    </div>
                    {phase.checks && phase.checks.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {phase.checks.slice(0, 3).map((check, cidx) => (
                          <li key={cidx} className="text-sm text-gray-400 flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 mt-0.5 text-green-400 flex-shrink-0" />
                            <span>{check}</span>
                          </li>
                        ))}
                        {phase.checks.length > 3 && (
                          <li className="text-sm text-gray-500">+ {phase.checks.length - 3} more checks</li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specific Threats */}
          {scanPlan.specific_threats && scanPlan.specific_threats.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Specific Threats
              </h4>
              <div className="space-y-3">
                {scanPlan.specific_threats.map((threat, idx) => (
                  <div key={idx} className="border-l-2 border-red-400 pl-4">
                    <h5 className="font-bold text-red-400">{threat.threat}</h5>
                    <p className="text-gray-400 text-sm mt-1">{threat.description}</p>
                    <p className="text-green-400 text-sm mt-2">
                      <span className="font-medium">Mitigation:</span> {threat.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vigil Modules */}
          {scanPlan.vigil_modules && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-vigil-purple" />
                Vigil Module Recommendations
              </h4>
              <div className="space-y-3">
                {scanPlan.vigil_modules.supply_guard && (
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${scanPlan.vigil_modules.supply_guard.enabled ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-white">SupplyGuard</div>
                      {scanPlan.vigil_modules.supply_guard.enabled ? (
                        <>
                          <div className="text-sm text-green-400">Recommended</div>
                          {scanPlan.vigil_modules.supply_guard.focus_areas && (
                            <div className="text-sm text-gray-400 mt-1">
                              Focus: {scanPlan.vigil_modules.supply_guard.focus_areas.join(', ')}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Not recommended for this project</div>
                      )}
                    </div>
                  </div>
                )}
                {scanPlan.vigil_modules.align_guard && (
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${scanPlan.vigil_modules.align_guard.enabled ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-white">AlignGuard</div>
                      {scanPlan.vigil_modules.align_guard.enabled ? (
                        <>
                          <div className="text-sm text-green-400">Recommended</div>
                          {scanPlan.vigil_modules.align_guard.focus_areas && (
                            <div className="text-sm text-gray-400 mt-1">
                              Focus: {scanPlan.vigil_modules.align_guard.focus_areas.join(', ')}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Not recommended for this project</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommended Tools */}
          {scanPlan.recommended_tools && scanPlan.recommended_tools.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-bold text-white mb-3">Recommended Tools</h4>
              <div className="flex flex-wrap gap-2">
                {scanPlan.recommended_tools.map((tool, idx) => (
                  <span key={idx} className="px-3 py-1 bg-slate-700 text-gray-300 rounded text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Plans */}
      {recentPlans.length > 0 && !scanPlan && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Recent Scan Plans</h3>
          <div className="space-y-2">
            {recentPlans.map((planData) => (
              <div
                key={planData.id}
                className="p-3 bg-slate-900/50 rounded border border-slate-700 hover:border-vigil-purple cursor-pointer transition-colors"
                onClick={() => setScanPlan(planData.plan)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{planData.project_name}</div>
                    <div className="text-sm text-gray-400">{planData.repo_url}</div>
                  </div>
                  <div className={`text-sm font-medium ${getRiskColor(planData.risk_level)}`}>
                    {planData.risk_level}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
