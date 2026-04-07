import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { formatSatisfactionPercent } from '../utils/satisfactionDisplay'
import LoadingSpinner from '../components/common/LoadingSpinner'

const PIE_AUTO = '#f97316'
const PIE_MANUAL = '#64748b'

export default function Analytics() {
  const { role } = useAuth()
  const {
    feedback,
    flaggedTotal,
    issueTypesFromFeedback,
    escalation,
    ticketsByIssueType,
    loadError,
    loading,
    reload
  } = useAnalyticsData(role)

  if (!role || (role !== 'Agent' && role !== 'Admin')) {
    return <Navigate to="/" replace />
  }

  const topIssueByFeedback = [...issueTypesFromFeedback]
    .sort((a, b) => b.totalRatings - a.totalRatings)
    .slice(0, 10)
    .map((r) => ({
      name: formatIssueLabel(r.issueType),
      ratings: r.totalRatings,
      satisfaction: Math.round(r.satisfactionRate * 100) / 100
    }))

  const topIssueByTickets = ticketsByIssueType.slice(0, 10).map((r) => ({
    name: formatIssueLabel(r.issueType),
    tickets: r.count
  }))

  const stackedFeedback = issueTypesFromFeedback
    .filter((r) => r.up + r.down > 0)
    .sort((a, b) => b.totalRatings - a.totalRatings)
    .slice(0, 8)
    .map((r) => ({
      name: truncateLabel(formatIssueLabel(r.issueType), 18),
      Up: r.up,
      Down: r.down
    }))

  const pieData = [
    { name: 'Auto (escalation)', value: escalation.autoTickets, fill: PIE_AUTO },
    { name: 'Manual', value: escalation.manualTickets, fill: PIE_MANUAL }
  ].filter((d) => d.value > 0)

  const satisfactionTrend = issueTypesFromFeedback
    .filter((r) => r.totalRatings > 0)
    .sort((a, b) => a.satisfactionRate - b.satisfactionRate)
    .slice(0, 8)
    .map((r) => ({
      name: truncateLabel(formatIssueLabel(r.issueType), 14),
      satisfaction: Math.round(r.satisfactionRate * 1000) / 10
    }))

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            Chatbot value and support effectiveness: issue mix, escalations, and feedback by topic.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Total ratings"
              value={feedback?.totalRatings ?? '—'}
              hint="Thumbs up + down"
            />
            <KpiCard
              label="Satisfaction"
              value={
                feedback?.satisfactionRate != null
                  ? formatSatisfactionPercent(feedback.satisfactionRate)
                  : '—'
              }
              hint="Positive feedback share"
            />
            <KpiCard
              label="Escalation rate"
              value={
                escalation.escalationRate != null ? `${escalation.escalationRate}%` : '—'
              }
              hint="Auto tickets / all tickets"
            />
            <KpiCard label="Flagged feedback" value={flaggedTotal} hint="Needs review" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <ChartCard title="Top issue types (feedback volume)">
              {topIssueByFeedback.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topIssueByFeedback} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg-opacity, #fff)',
                        border: '1px solid #e5e7eb'
                      }}
                      formatter={(v) => [String(v ?? ''), 'Ratings']}
                    />
                    <Bar dataKey="ratings" fill="#3b82f6" name="Ratings" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Tickets by issue type (sample)">
              {topIssueByTickets.length === 0 ? (
                <EmptyChart message="No tickets in current page" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topIssueByTickets} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="tickets" fill="#10b981" name="Tickets" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <ChartCard
              title="Escalation mix"
              subtitle="Auto-created tickets (from chat escalation) vs manual"
            >
              {pieData.length === 0 ? (
                <EmptyChart message="No ticket data" />
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={pieData[i].fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li>
                      <span className="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style={{ background: PIE_AUTO }} />
                      Auto: {escalation.autoTickets}
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style={{ background: PIE_MANUAL }} />
                      Manual: {escalation.manualTickets}
                    </li>
                  </ul>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Feedback sentiment by issue type"
              subtitle="Thumbs up vs down (topics)"
            >
              {stackedFeedback.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stackedFeedback} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Up" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Down" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Lowest satisfaction by issue type"
            subtitle="Identify topics that may need better answers or docs"
          >
            {satisfactionTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={satisfactionTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v ?? '—'}%`, 'Satisfaction']} />
                  <Line
                    type="monotone"
                    dataKey="satisfaction"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Satisfaction %"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}
    </div>
  )
}

function formatIssueLabel(raw: string): string {
  if (!raw || raw === 'Unknown') return 'Unknown'
  return raw.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

function truncateLabel(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{hint}</p>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-2" />}
      {children}
    </div>
  )
}

function EmptyChart({ message = 'No data yet' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-[280px] text-gray-500 dark:text-gray-400 text-sm">
      {message}
    </div>
  )
}
