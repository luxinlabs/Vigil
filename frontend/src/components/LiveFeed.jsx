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
          dot: 'bg-red-500',
          bg: 'bg-red-50 border-red-200 hover:bg-red-100',
          text: 'text-red-600',
          badge: 'bg-red-600 text-white'
        }
      case 'WARNING':
        return {
          dot: 'bg-yellow-500',
          bg: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
          text: 'text-yellow-600',
          badge: 'bg-yellow-600 text-white'
        }
      case 'ALLOWED':
      case 'CLEAN':
        return {
          dot: 'bg-green-500',
          bg: 'bg-green-50 border-green-200 hover:bg-green-100',
          text: 'text-green-600',
          badge: 'bg-green-600 text-white'
        }
      default:
        return {
          dot: 'bg-gray-400',
          bg: 'bg-white border-gray-200 hover:bg-gray-50',
          text: 'text-gray-600',
          badge: 'bg-gray-600 text-white'
        }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Live Scan Feed
        </h2>
        <span className="text-sm text-gray-500">{events.length} events</span>
      </div>

      <div className="overflow-y-auto max-h-[600px]">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No scan events yet</p>
            <p className="text-sm mt-1">Run a demo or scan a package to see results</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
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
                    isSelected ? 'border-l-gray-900' : 'border-l-transparent'
                  } ${colors.bg}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${colors.dot} flex-shrink-0`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-gray-900 truncate">
                          {packageName}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>
                          {event.verdict}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className={`font-bold ${colors.text}`}>
                          Score: {score.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo}
                        </span>
                        <span>{scanMs}ms</span>
                        {event.machine && (
                          <span className="text-gray-400">@ {event.machine}</span>
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
