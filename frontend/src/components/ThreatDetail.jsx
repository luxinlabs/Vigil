import { X, AlertTriangle, Clock, Activity } from 'lucide-react'

function ThreatDetail({ event, onClose }) {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-vigil-red text-white'
      case 'HIGH':
        return 'bg-orange-600 text-white'
      case 'MEDIUM':
        return 'bg-vigil-yellow text-white'
      case 'LOW':
        return 'bg-slate-600 text-white'
      default:
        return 'bg-slate-700 text-white'
    }
  }

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'BLOCKED':
      case 'COMPROMISED':
        return 'bg-vigil-red text-white'
      case 'WARNING':
        return 'bg-vigil-yellow text-white'
      case 'ALLOWED':
      case 'CLEAN':
        return 'bg-vigil-green text-white'
      default:
        return 'bg-slate-700 text-white'
    }
  }

  const formatTimestamp = (ts) => {
    return new Date(ts * 1000).toLocaleString()
  }

  const packageName = event.package || event.source || 'Unknown'
  const findings = event.findings || []
  const score = event.score !== undefined ? event.score : 0

  return (
    <div className="bg-vigil-card border border-vigil-border rounded-lg overflow-hidden sticky top-6">
      <div className="p-4 border-b border-vigil-border flex items-center justify-between bg-vigil-bg">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-vigil-red-light" />
          Threat Analysis
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 max-h-[600px] overflow-y-auto">
        <div className="mb-4">
          <div className="font-mono text-lg font-bold text-white mb-2">
            {packageName}
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getVerdictColor(event.verdict)}`}>
              {event.verdict}
            </span>
            <span className="text-2xl font-bold text-vigil-red-light">
              {score.toFixed(2)}
            </span>
            <span className="text-slate-400">/ 1.0</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTimestamp(event.ts)}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              {event.scan_ms || 0}ms
            </span>
          </div>
        </div>

        {findings.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Findings ({findings.length})
            </h3>
            
            {findings.map((finding, index) => (
              <div
                key={index}
                className="bg-vigil-bg border border-vigil-border rounded-lg p-3"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getSeverityColor(finding.severity)}`}>
                    {finding.severity || 'UNKNOWN'}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm mb-1">
                      {finding.type || finding.description || 'Unknown threat'}
                    </div>
                    <div className="text-sm text-slate-300">
                      {finding.detail || finding.description || ''}
                    </div>
                  </div>
                </div>

                {finding.explanation && (
                  <div className="text-xs text-slate-400 mt-2 pl-2 border-l-2 border-vigil-border">
                    {finding.explanation}
                  </div>
                )}

                {finding.file && (
                  <div className="text-xs text-slate-500 mt-2 font-mono">
                    File: {finding.file}
                  </div>
                )}

                {finding.code_snippet && (
                  <div className="mt-2 bg-black/50 rounded p-2 overflow-x-auto">
                    <pre className="text-xs font-mono text-slate-300">
                      {finding.code_snippet}
                    </pre>
                  </div>
                )}

                {finding.matched && (
                  <div className="mt-2 bg-black/50 rounded p-2">
                    <div className="text-xs text-slate-500 mb-1">Matched pattern:</div>
                    <code className="text-xs font-mono text-vigil-red-light">
                      {finding.matched}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500 py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No detailed findings available</p>
          </div>
        )}

        {event.demo && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
            <div className="text-sm font-semibold text-vigil-red-light mb-1">
              ⚠️ Demo Attack Simulation
            </div>
            <div className="text-xs text-slate-400">
              This event represents an attack scenario without Vigil protection.
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-vigil-border">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
            Timeline
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Scan initiated</span>
              <span className="font-mono">{formatTimestamp(event.ts)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Analysis completed</span>
              <span className="font-mono">{event.scan_ms || 0}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white font-semibold">Final verdict</span>
              <span className={`font-bold ${
                event.verdict === 'BLOCKED' || event.verdict === 'COMPROMISED' 
                  ? 'text-vigil-red-light' 
                  : event.verdict === 'WARNING' 
                  ? 'text-vigil-yellow-light' 
                  : 'text-vigil-green-light'
              }`}>
                {event.verdict}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThreatDetail
