import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

function StatsBar({ events }) {
  const stats = {
    total: events.length,
    blocked: events.filter(e => e.verdict === 'BLOCKED' || e.verdict === 'COMPROMISED').length,
    warnings: events.filter(e => e.verdict === 'WARNING').length,
    safe: events.filter(e => e.verdict === 'ALLOWED' || e.verdict === 'CLEAN').length
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Shield className="w-6 h-6" />}
        label="Total Scanned"
        value={stats.total}
        color="text-slate-400"
        bgColor="bg-vigil-card"
      />
      <StatCard
        icon={<XCircle className="w-6 h-6" />}
        label="Blocked"
        value={stats.blocked}
        color="text-vigil-red-light"
        bgColor="bg-red-900/20"
        pulse={stats.blocked > 0}
      />
      <StatCard
        icon={<AlertTriangle className="w-6 h-6" />}
        label="Warnings"
        value={stats.warnings}
        color="text-vigil-yellow-light"
        bgColor="bg-yellow-900/20"
      />
      <StatCard
        icon={<CheckCircle className="w-6 h-6" />}
        label="Safe"
        value={stats.safe}
        color="text-vigil-green-light"
        bgColor="bg-green-900/20"
      />
    </div>
  )
}

function StatCard({ icon, label, value, color, bgColor, pulse }) {
  return (
    <div className={`${bgColor} border border-vigil-border rounded-lg p-4 transition-all ${pulse ? 'animate-pulse-slow' : ''}`}>
      <div className="flex items-center justify-between">
        <div className={color}>
          {icon}
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${color}`}>
            {value}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsBar
