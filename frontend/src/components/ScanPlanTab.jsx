import { useState, useEffect } from 'react';
import { Search, GitBranch, AlertTriangle, CheckCircle, Clock, Shield, Zap } from 'lucide-react';

export default function ScanPlanTab() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [repoInfo, setRepoInfo] = useState(null);
  const [scanPlan, setScanPlan] = useState(null);
  const [recentPlans, setRecentPlans] = useState([]);
  const [error, setError] = useState(null);

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

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-vigil-purple" />
          AI-Powered Scan Plan Generator
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              GitHub Repository URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-vigil-purple"
                onKeyPress={(e) => e.key === 'Enter' && handlePreview()}
              />
              <button
                onClick={handlePreview}
                disabled={loading || !repoUrl.trim()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={loading || !repoUrl.trim()}
                className="px-6 py-2 bg-vigil-purple hover:bg-purple-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Zap className="w-4 h-4" />
                {loading ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-vigil-purple border-t-transparent"></div>
              <span>Analyzing repository with AI...</span>
            </div>
          )}
        </div>
      </div>

      {/* Repository Info */}
      {repoInfo && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Repository Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="text-white ml-2 font-medium">{repoInfo.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Language:</span>
              <span className="text-white ml-2">{repoInfo.language || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-400">Stars:</span>
              <span className="text-white ml-2">{repoInfo.stars || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Size:</span>
              <span className="text-white ml-2">{repoInfo.size || 0} KB</span>
            </div>
            {repoInfo.description && (
              <div className="col-span-2">
                <span className="text-gray-400">Description:</span>
                <p className="text-white mt-1">{repoInfo.description}</p>
              </div>
            )}
          </div>
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
