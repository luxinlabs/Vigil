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
          dot: 'bg-vigil-red-light',
          bg: 'bg-red-900/20 border-red-900/50',
          text: 'text-vigil-red-light',
          badge: 'bg-vigil-red text-white'
        }
      case 'WARNING':
        return {
          dot: 'bg-vigil-yellow-light',
          bg: 'bg-yellow-900/20 border-yellow-900/50',
          text: 'text-vigil-yellow-light',
          badge: 'bg-vigil-yellow text-white'
        }
      case 'CLEAN':
        return {
          dot: 'bg-vigil-green-light',
          bg: 'bg-green-900/10 border-vigil-border',
          text: 'text-vigil-green-light',
          badge: 'bg-vigil-green text-white'
        }
      default:
        return {
          dot: 'bg-slate-500',
          bg: 'bg-vigil-card border-vigil-border',
          text: 'text-slate-400',
          badge: 'bg-slate-700 text-white'
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
      <div className="bg-vigil-card border border-vigil-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-vigil-purple" />
          <h2 className="text-xl font-bold text-white">AlignGuard — Prompt Injection Detection</h2>
        </div>
        <p className="text-slate-400 text-sm">
          Scans text and documents before feeding to AI agents. Detects prompt injection, goal redirection, 
          concealment commands, and exfiltration instructions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-vigil-card border border-vigil-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-vigil-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Scans
              </h3>
              <span className="text-sm text-slate-400">{events.length} scans</span>
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {events.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No alignment scans yet</p>
                  <p className="text-sm mt-1">Run the injection demo to see results</p>
                </div>
              ) : (
                <div className="divide-y divide-vigil-border">
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
                          isSelected ? 'border-l-vigil-purple' : 'border-l-transparent'
                        } ${colors.bg}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.dot} flex-shrink-0 mt-1`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span className="font-mono text-sm font-medium text-white truncate">
                                {source}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>
                                {event.verdict}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                              <span className={`font-bold ${colors.text}`}>
                                Score: {score.toFixed(2)}
                              </span>
                              <span>Agent: {agentId}</span>
                              <span>{formatTimeAgo(event.ts)}</span>
                            </div>

                            {event.findings && event.findings.length > 0 && (
                              <div className="text-xs text-slate-300 mt-2">
                                <span className="text-vigil-red-light font-semibold">
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
            <div className="bg-vigil-card border border-vigil-border rounded-lg overflow-hidden sticky top-6">
              <div className="p-4 border-b border-vigil-border bg-vigil-bg">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-vigil-red-light" />
                  Injection Analysis
                </h3>
              </div>

              <div className="p-4 max-h-[600px] overflow-y-auto">
                <div className="mb-4">
                  <div className="font-mono text-sm font-bold text-white mb-2">
                    {selectedEvent.source || selectedEvent.extra?.source || 'Unknown'}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      getVerdictColor(selectedEvent.verdict).badge
                    }`}>
                      {selectedEvent.verdict}
                    </span>
                    <span className="text-2xl font-bold text-vigil-red-light">
                      {(selectedEvent.score || 0).toFixed(2)}
                    </span>
                    <span className="text-slate-400">/ 1.0</span>
                  </div>

                  <div className="text-sm text-slate-400 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4" />
                      <span>Agent: {selectedEvent.agent_id || selectedEvent.extra?.agent_id || 'unknown'}</span>
                    </div>
                  </div>
                </div>

                {selectedEvent.findings && selectedEvent.findings.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                      Detected Threats
                    </h4>
                    
                    {selectedEvent.findings.map((finding, index) => (
                      <div
                        key={index}
                        className="bg-vigil-bg border border-vigil-border rounded-lg p-3"
                      >
                        <div className="text-sm font-semibold text-vigil-red-light mb-1">
                          {finding.description || finding.type}
                        </div>
                        {finding.matched && (
                          <div className="mt-2 bg-black/50 rounded p-2">
                            <div className="text-xs text-slate-500 mb-1">Matched pattern:</div>
                            <code className="text-xs font-mono text-vigil-red-light break-all">
                              {finding.matched}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedEvent.verdict === 'BLOCKED' && (
                  <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg mb-4">
                    <div className="text-sm font-semibold text-vigil-red-light mb-1">
                      🚨 Document Quarantined
                    </div>
                    <div className="text-xs text-slate-400">
                      This document was blocked from reaching the AI agent. The agent's original goal remains intact.
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-vigil-border">
                  <button
                    onClick={() => handleKillAgent(selectedEvent.agent_id || selectedEvent.extra?.agent_id || 'unknown')}
                    className="w-full px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-vigil-red-light rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                  >
                    <Skull className="w-4 h-4" />
                    Kill Agent
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Terminate agent if compromise suspected
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-vigil-card border border-vigil-border rounded-lg p-8 text-center text-slate-500">
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
