import { useState } from 'react'
import { Bot, FileText, AlertTriangle, Shield, Skull } from 'lucide-react'

function AgentTab({ events }) {
  const [selectedEvent, setSelectedEvent] = useState(null)

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'BLOCKED':
        return {
          dot: 'bg-red-500',
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-600',
          badge: 'bg-red-600 text-white'
        }
      case 'WARNING':
        return {
          dot: 'bg-yellow-500',
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-600',
          badge: 'bg-yellow-600 text-white'
        }
      case 'CLEAN':
        return {
          dot: 'bg-green-500',
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-600',
          badge: 'bg-green-600 text-white'
        }
      default:
        return {
          dot: 'bg-gray-400',
          bg: 'bg-white border-gray-200',
          text: 'text-gray-600',
          badge: 'bg-gray-600 text-white'
        }
    }
  }

  const handleKillAgent = async (agentId) => {
    try {
      await fetch(`http://localhost:8000/agents/${agentId}/kill`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to kill agent:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-gray-900" />
          <h2 className="text-xl font-bold text-gray-900">AlignGuard — Prompt Injection Detection</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Scans text and documents before feeding to AI agents. Detects prompt injection, goal redirection, 
          concealment commands, and exfiltration instructions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Scans
              </h3>
              <span className="text-sm text-gray-500">{events.length} scans</span>
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {events.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No alignment scans yet</p>
                  <p className="text-sm mt-1">Run the injection demo to see results</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {events.map((event, index) => {
                    const colors = getVerdictColor(event.verdict)
                    const isSelected = selectedEvent?.id === event.id
                    const source = event.source || event.extra?.source || 'Unknown'
                    const agentId = event.agent_id || event.extra?.agent_id || 'unknown'
                    const score = event.score !== undefined ? event.score : 0

                    return (
                      <div
                        key={event.id || index}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-4 cursor-pointer transition-all animate-slide-in border-l-4 ${
                          isSelected ? 'border-l-gray-900' : 'border-l-transparent'
                        } ${colors.bg}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.dot} flex-shrink-0 mt-1`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="font-mono text-sm font-medium text-gray-900 truncate">
                                {source}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>
                                {event.verdict}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                              <span className={`font-bold ${colors.text}`}>
                                Score: {score.toFixed(2)}
                              </span>
                              <span>Agent: {agentId}</span>
                              <span>{formatTimeAgo(event.ts)}</span>
                            </div>

                            {event.findings && event.findings.length > 0 && (
                              <div className="text-xs text-gray-700 mt-2">
                                <span className="text-red-600 font-semibold">
                                  {event.findings.length} threat(s) detected
                                </span>
                                {' — '}
                                {event.findings[0].description || event.findings[0].type}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          {selectedEvent ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden sticky top-6 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Injection Analysis
                </h3>
              </div>

              <div className="p-4 max-h-[600px] overflow-y-auto">
                <div className="mb-4">
                  <div className="font-mono text-sm font-bold text-gray-900 mb-2">
                    {selectedEvent.source || selectedEvent.extra?.source || 'Unknown'}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      getVerdictColor(selectedEvent.verdict).badge
                    }`}>
                      {selectedEvent.verdict}
                    </span>
                    <span className="text-2xl font-bold text-red-600">
                      {(selectedEvent.score || 0).toFixed(2)}
                    </span>
                    <span className="text-gray-500">/ 1.0</span>
                  </div>

                  <div className="text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4" />
                      <span>Agent: {selectedEvent.agent_id || selectedEvent.extra?.agent_id || 'unknown'}</span>
                    </div>
                  </div>
                </div>

                {selectedEvent.findings && selectedEvent.findings.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Detected Threats
                    </h4>
                    
                    {selectedEvent.findings.map((finding, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                      >
                        <div className="text-sm font-semibold text-red-700 mb-1">
                          {finding.description || finding.type}
                        </div>
                        {finding.matched && (
                          <div className="mt-2 bg-gray-900 rounded p-2">
                            <div className="text-xs text-gray-400 mb-1">Matched pattern:</div>
                            <code className="text-xs font-mono text-red-400 break-all">
                              {finding.matched}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedEvent.verdict === 'BLOCKED' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <div className="text-sm font-semibold text-red-700 mb-1">
                      🚨 Document Quarantined
                    </div>
                    <div className="text-xs text-red-600">
                      This document was blocked from reaching the AI agent. The agent's original goal remains intact.
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleKillAgent(selectedEvent.agent_id || selectedEvent.extra?.agent_id || 'unknown')}
                    className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                  >
                    <Skull className="w-4 h-4" />
                    Kill Agent
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Terminate agent if compromise suspected
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 shadow-sm">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a scan to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgentTab
