import { Clock, Package, AlertCircle } from 'lucide-react'

function LiveFeed({ events, onSelectEvent, selectedEventId }) {
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
      case 'COMPROMISED':
        return {
          dot: 'bg-vigil-red-light',
          bg: 'bg-red-900/20 border-red-900/50 hover:bg-red-900/30',
          text: 'text-vigil-red-light',
          badge: 'bg-vigil-red text-white'
        }
      case 'WARNING':
        return {
          dot: 'bg-vigil-yellow-light',
          bg: 'bg-yellow-900/20 border-yellow-900/50 hover:bg-yellow-900/30',
          text: 'text-vigil-yellow-light',
          badge: 'bg-vigil-yellow text-white'
        }
      case 'ALLOWED':
      case 'CLEAN':
        return {
          dot: 'bg-vigil-green-light',
          bg: 'bg-green-900/10 border-vigil-border hover:bg-green-900/20',
          text: 'text-vigil-green-light',
          badge: 'bg-vigil-green text-white'
        }
      default:
        return {
          dot: 'bg-slate-500',
          bg: 'bg-vigil-card border-vigil-border hover:bg-vigil-border',
          text: 'text-slate-400',
          badge: 'bg-slate-700 text-white'
        }
    }
  }

  return (
    <div className="bg-vigil-card border border-vigil-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-vigil-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Live Scan Feed
        </h2>
        <span className="text-sm text-slate-400">{events.length} events</span>
      </div>

      <div className="overflow-y-auto max-h-[600px]">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No scan events yet</p>
            <p className="text-sm mt-1">Run a demo or scan a package to see results</p>
          </div>
        ) : (
          <div className="divide-y divide-vigil-border">
            {events.map((event, index) => {
              const colors = getVerdictColor(event.verdict)
              const isSelected = event.id === selectedEventId
              const packageName = event.package || event.source || 'Unknown'
              const score = event.score !== undefined ? event.score : 0
              const scanMs = event.scan_ms || 0
              const timeAgo = formatTimeAgo(event.ts)

              return (
                <div
                  key={event.id || index}
                  onClick={() => onSelectEvent(event)}
                  className={`p-4 cursor-pointer transition-all animate-slide-in border-l-4 ${
                    isSelected ? 'border-l-vigil-purple' : 'border-l-transparent'
                  } ${colors.bg}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${colors.dot} flex-shrink-0`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-white truncate">
                          {packageName}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>
                          {event.verdict}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className={`font-bold ${colors.text}`}>
                          Score: {score.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo}
                        </span>
                        <span>{scanMs}ms</span>
                        {event.machine && (
                          <span className="text-slate-500">@ {event.machine}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveFeed
