import { useState, useEffect } from 'react'
import { X, AlertTriangle, Clock, Activity, Shield } from 'lucide-react'

function ThreatDetail({ event, onClose }) {
  const [cveData, setCveData] = useState(null)
  const [loadingCve, setLoadingCve] = useState(false)
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white'
      case 'HIGH':
        return 'bg-orange-600 text-white'
      case 'MEDIUM':
        return 'bg-yellow-600 text-white'
      case 'LOW':
        return 'bg-gray-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'BLOCKED':
      case 'COMPROMISED':
        return 'bg-red-600 text-white'
      case 'WARNING':
        return 'bg-yellow-600 text-white'
      case 'ALLOWED':
      case 'CLEAN':
        return 'bg-green-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const formatTimestamp = (ts) => {
    return new Date(ts * 1000).toLocaleString()
  }

  const packageName = event.package || event.source || 'Unknown'
  const findings = event.findings || []
  const score = event.score !== undefined ? event.score : 0

  useEffect(() => {
    const fetchCveData = async () => {
      if (!event.package) return
      
      setLoadingCve(true)
      try {
        const parts = event.package.split('==')
        const pkgName = parts[0]
        const version = parts[1] || null
        
        const url = version 
          ? `http://localhost:8000/cve/analyze/${pkgName}?version=${version}`
          : `http://localhost:8000/cve/analyze/${pkgName}`
        
        const response = await fetch(url)
        const data = await response.json()
        setCveData(data)
      } catch (error) {
        console.error('Failed to fetch CVE data:', error)
      } finally {
        setLoadingCve(false)
      }
    }
    
    fetchCveData()
  }, [event.package])

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden sticky top-6 shadow-sm">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Threat Analysis
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 max-h-[600px] overflow-y-auto">
        <div className="mb-4">
          <div className="font-mono text-lg font-bold text-gray-900 mb-2">
            {packageName}
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getVerdictColor(event.verdict)}`}>
              {event.verdict}
            </span>
            <span className="text-2xl font-bold text-red-600">
              {score.toFixed(2)}
            </span>
            <span className="text-gray-500">/ 1.0</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
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
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Findings ({findings.length})
            </h3>
            
            {findings.map((finding, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getSeverityColor(finding.severity)}`}>
                    {finding.severity || 'UNKNOWN'}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {finding.type || finding.description || 'Unknown threat'}
                    </div>
                    <div className="text-sm text-gray-700">
                      {finding.detail || finding.description || ''}
                    </div>
                  </div>
                </div>

                {finding.explanation && (
                  <div className="text-xs text-gray-600 mt-2 pl-2 border-l-2 border-gray-300">
                    {finding.explanation}
                  </div>
                )}

                {finding.file && (
                  <div className="text-xs text-gray-500 mt-2 font-mono">
                    File: {finding.file}
                  </div>
                )}

                {finding.code_snippet && (
                  <div className="mt-2 bg-gray-900 rounded p-2 overflow-x-auto">
                    <pre className="text-xs font-mono text-gray-100">
                      {finding.code_snippet}
                    </pre>
                  </div>
                )}

                {finding.matched && (
                  <div className="mt-2 bg-gray-900 rounded p-2">
                    <div className="text-xs text-gray-400 mb-1">Matched pattern:</div>
                    <code className="text-xs font-mono text-red-400">
                      {finding.matched}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No detailed findings available</p>
          </div>
        )}

        {event.demo && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-semibold text-red-700 mb-1">
              ⚠️ Demo Attack Simulation
            </div>
            <div className="text-xs text-red-600">
              This event represents an attack scenario without Vigil protection.
            </div>
          </div>
        )}

        {cveData && cveData.success && cveData.has_cves && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              <Shield className="w-4 h-4 inline mr-2" />
              CVE Analysis
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-900">
                  {cveData.cve_count} Known CVE{cveData.cve_count !== 1 ? 's' : ''} Found
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  cveData.overall_risk === 'CRITICAL' ? 'bg-red-600 text-white' :
                  cveData.overall_risk === 'HIGH' ? 'bg-orange-600 text-white' :
                  cveData.overall_risk === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {cveData.overall_risk} RISK
                </span>
              </div>
              <p className="text-xs text-blue-700">{cveData.recommendation}</p>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cveData.cves.map((cve, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-gray-900">{cve.cve_id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      cve.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                      cve.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                      cve.severity === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {cve.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mb-2">{cve.description}</p>
                  {cve.fixed_in && (
                    <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                      Fixed in: {cve.fixed_in}
                    </div>
                  )}
                  {cve.mitigation && (
                    <div className="text-xs text-gray-600 mt-1">
                      <strong>Mitigation:</strong> {cve.mitigation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {loadingCve && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center text-gray-500 py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900 mx-auto mb-2"></div>
              <p className="text-sm">Analyzing CVEs with AI...</p>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Timeline
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Scan initiated</span>
              <span className="font-mono">{formatTimestamp(event.ts)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Analysis completed</span>
              <span className="font-mono">{event.scan_ms || 0}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900 font-semibold">Final verdict</span>
              <span className={`font-bold ${
                event.verdict === 'BLOCKED' || event.verdict === 'COMPROMISED' 
                  ? 'text-red-600' 
                  : event.verdict === 'WARNING' 
                  ? 'text-yellow-600' 
                  : 'text-green-600'
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
