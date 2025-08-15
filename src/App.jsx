import { useState, useEffect, useMemo } from 'react'
import './App.css'

function App() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('system') // 'light' | 'dark' | 'system'
  const [view, setView] = useState('table') // 'table' | 'cards'

  // Theme: hydrate from localStorage / system and reflect on <html>
  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'system'
    setTheme(stored)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldDark = theme === 'dark' || (theme === 'system' && systemDark)
    root.classList.toggle('dark', shouldDark)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Fetch data once
  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch('http://localhost:5000/api/data')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setApplications(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []))
      } catch (err) {
        console.error('An error has occured', err)
        setApplications([])
      } finally {
        setLoading(false)
      }
    }
    fetchApplications()
  }, [])

  const columns = useMemo(() => {
    if (!applications.length) return []
    return Object.keys(applications[0])
  }, [applications])

  const stats = useMemo(() => {
    const total = applications.length
    const firstItem = applications[0] || {}
    const hasCompany = 'company' in firstItem
    const hasStatus = 'status' in firstItem

    const companyCount = hasCompany ? new Set(applications.map(a => a.company)).size : null
    const statusMap = hasStatus ? applications.reduce((acc, cur) => {
      const s = String(cur.status ?? 'Unknown')
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {}) : null

    return { total, companyCount, statusMap }
  }, [applications])

  return (
    
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Internship Applications</h1>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} setView={setView} />
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Stats Row */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard label="Total" value={stats.total} />
          {stats.companyCount !== null && <StatCard label="Companies" value={stats.companyCount} />}
          {stats.statusMap && (
            <div className="col-span-full">
              <StatusSummary statusMap={stats.statusMap} />
            </div>
          )}
        </section>

        {/* Content */}
        <section className="transition-all duration-300">
          {loading ? (
            <Skeleton />
          ) : applications.length === 0 ? (
            <EmptyState onRetry={() => window.location.reload()} />
          ) : view === 'table' ? (
            <DataTable columns={columns} rows={applications} />
          ) : (
            <CardGrid items={applications} />
          )}
        </section>
      </main>
    </div>
  )
}

// ——— UI Components ———

function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-800/60 shadow-sm overflow-hidden">
      {['light', 'system', 'dark'].map(opt => (
        <button
          key={opt}
          onClick={() => setTheme(opt)}
          className={`px-3 py-2 text-sm transition-colors duration-200 ${theme === opt ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          aria-pressed={theme === opt}
        >
          {opt === 'light' ? '☀️' : opt === 'dark' ? '🌙' : '🖥️'} <span className="hidden sm:inline capitalize ml-1">{opt}</span>
        </button>
      ))}
    </div>
  )
}

function ViewToggle({ view, setView }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-800/60 shadow-sm overflow-hidden">
      {[
        { id: 'table', label: 'Table', icon: '📋' },
        { id: 'cards', label: 'Cards', icon: '🗂️' },
      ].map(opt => (
        <button
          key={opt.id}
          onClick={() => setView(opt.id)}
          className={`px-3 py-2 text-sm transition-colors duration-200 ${view === opt.id ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          aria-pressed={view === opt.id}
        >
          <span className="mr-1">{opt.icon}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm transition hover:shadow-md">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

function StatusSummary({ statusMap }) {
  const entries = Object.entries(statusMap)
  const total = entries.reduce((s, [, n]) => s + n, 0)

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">Status Overview</div>
      <div className="flex flex-wrap items-center gap-3">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-2">
            <span className={`inline-flex h-2 w-2 rounded-full ${dotColor(status)}`}></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{status}</span>
            <span className="text-sm text-gray-500">({count})</span>
          </div>
        ))}
      </div>
      {/* Simple proportion bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="flex h-full w-full">
          {entries.map(([status, count]) => (
            <div
              key={status}
              className={`h-full ${barColor(status)} transition-all duration-500`}
              style={{ width: `${(count / total) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-750">
          <tr>
            {columns.map((key) => (
              <th key={key} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
              {columns.map((key) => (
                <td key={key} className="px-4 py-3 align-top text-gray-800 dark:text-gray-100">
                  {renderCell(key, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CardGrid({ items }) {
  const first = items[0] || {}
  const keys = Object.keys(first)
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, idx) => (
        <article key={item.id ?? idx} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <h3 className="text-base font-semibold leading-tight line-clamp-2">
              {String(item.title ?? item.role ?? item.position ?? item.company ?? 'Application')}
            </h3>
            <div>{'status' in item ? <StatusBadge status={item.status} /> : null}</div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {keys.slice(0, 6).map(k => (
              <div key={k} className="truncate">
                <dt className="text-gray-500 dark:text-gray-400 truncate">{k}</dt>
                <dd className="text-gray-900 dark:text-gray-100 truncate">{String(item[k])}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
    </div>
  )
}

function EmptyState({ onRetry }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
      <div className="text-5xl mb-2">🧐</div>
      <h3 className="text-lg font-semibold">No applications found</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Try refreshing or check your API.</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-4 py-2 text-sm font-medium shadow-sm transition hover:opacity-90">Refresh</button>
    </div>
  )
}

// ——— Helpers ———

function renderCell(key, row) {
  const val = row[key]
  if (key.toLowerCase().includes('status')) return <StatusBadge status={val} />
  if (isUrl(String(val))) return <a className="underline decoration-dotted underline-offset-4" href={String(val)} target="_blank" rel="noreferrer">Link</a>
  return String(val)
}

function StatusBadge({ status }) {
  const s = String(status ?? 'Unknown')
  const map = {
    accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    interview: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    applied: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
    unknown: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
  }
  const cls = map[s.toLowerCase()] || map.unknown
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{s}</span>
}

function dotColor(status) {
  const s = String(status ?? 'Unknown').toLowerCase()
  if (s.includes('accept')) return 'bg-emerald-500'
  if (s.includes('interview')) return 'bg-blue-500'
  if (s.includes('reject')) return 'bg-rose-500'
  if (s.includes('appl') || s.includes('pend')) return 'bg-amber-500'
  return 'bg-slate-400'
}

function barColor(status) {
  const s = String(status ?? 'Unknown').toLowerCase()
  if (s.includes('accept')) return 'bg-emerald-500'
  if (s.includes('interview')) return 'bg-blue-500'
  if (s.includes('reject')) return 'bg-rose-500'
  if (s.includes('appl') || s.includes('pend')) return 'bg-amber-500'
  return 'bg-slate-500'
}

function isUrl(maybe) {
  try { const u = new URL(maybe); return !!u }
  catch { return false }
}

export default App
