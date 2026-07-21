import { useMemo, useState } from 'react'
import type { TbPurchase, PurchaseStatus } from '../types'
import {
  usePurchases, usePurchaseStats, PURCHASE_STATUSES, statusMeta, formatEuro,
} from '../hooks/usePurchases'
import type { PurchaseFilters } from '../hooks/usePurchases'
import { categoryColor, categoryLabel } from '../hooks/useSmallTasks'
import { NewPurchaseModal } from './NewPurchaseModal'
import { PurchaseDetailModal } from './PurchaseDetailModal'

const CATEGORIES = ['LP', 'RB', 'PNRR', 'FAM', 'PERS'] as const

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Giorni alla scadenza garanzia (null se non applicabile). */
function warrantyDaysLeft(until: string | null): number | null {
  if (!until) return null
  const d = new Date(until); d.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export function AcquistiView() {
  const {
    purchases, loading, addPurchase, updatePurchase, deletePurchase, markPurchased,
    addQuote, selectQuote, deleteQuote, quotesOf,
  } = usePurchases()

  const [cats, setCats] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<PurchaseFilters['status']>('aperti')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [detail, setDetail] = useState<TbPurchase | null>(null)

  const filters: PurchaseFilters = useMemo(
    () => ({ cats, status, from, to, text }),
    [cats, status, from, to, text]
  )
  const stats = usePurchaseStats(purchases, filters)

  function toggleCat(c: string) {
    setCats(prev => {
      const n = new Set(prev)
      n.has(c) ? n.delete(c) : n.add(c)
      return n
    })
  }

  function setPeriodo(preset: 'mese' | 'anno' | 'tutto') {
    const now = new Date()
    if (preset === 'tutto') { setFrom(''); setTo(''); return }
    if (preset === 'mese') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1)
      const t = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setFrom(f.toISOString().slice(0, 10)); setTo(t.toISOString().slice(0, 10))
    } else {
      setFrom(`${now.getFullYear()}-01-01`); setTo(`${now.getFullYear()}-12-31`)
    }
  }

  // Garanzie in scadenza nei prossimi 60 giorni
  const garanzieInScadenza = useMemo(
    () => purchases.filter(p => {
      const d = warrantyDaysLeft(p.pur_warranty_until)
      return d !== null && d >= 0 && d <= 60
    }),
    [purchases]
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🛒 Acquisti</h2>
          <p className="text-xs text-gray-500">
            {stats.nDaAcquistare} da acquistare · {stats.nAcquistati} acquistati
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="ml-auto bg-blue-700 text-white text-sm px-4 py-1.5 rounded font-medium hover:bg-blue-800 transition-colors"
        >
          + Nuovo acquisto
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Da acquistare (stima)" value={formatEuro(stats.previsto)} color="#1565C0" />
        <KpiCard label="Speso nel periodo" value={formatEuro(stats.speso)} color="#2E7D32" />
        <KpiCard
          label={stats.scostamento <= 0 ? 'Risparmio vs stima' : 'Extra vs stima'}
          value={formatEuro(Math.abs(stats.scostamento))}
          color={stats.scostamento <= 0 ? '#2E7D32' : '#C62828'}
          hint={stats.stimatoAcq > 0 ? `stimati ${formatEuro(stats.stimatoAcq)}` : undefined}
        />
        <KpiCard label="Totale complessivo" value={formatEuro(stats.previsto + stats.speso)} color="#424242" />
      </div>

      {/* Alert garanzie */}
      {garanzieInScadenza.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
          🛡️ <b>{garanzieInScadenza.length}</b> garanzi{garanzieInScadenza.length === 1 ? 'a' : 'e'} in scadenza entro 60 giorni:{' '}
          {garanzieInScadenza.slice(0, 3).map((p, i) => (
            <span key={p.pur_id}>
              {i > 0 && ' · '}
              {p.pur_title} ({fmtDate(p.pur_warranty_until)})
            </span>
          ))}
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cat</span>
          {CATEGORIES.map(c => {
            const active = cats.has(c)
            const color = categoryColor(c)
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className="text-xs px-2.5 py-1 rounded-full border transition-all"
                style={active
                  ? { backgroundColor: color, color: 'white', borderColor: color }
                  : { backgroundColor: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
              >
                {c}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stato</span>
          {(['aperti', 'tutti', ...PURCHASE_STATUSES.map(s => s.value)] as PurchaseFilters['status'][]).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                status === s ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              {s === 'aperti' ? 'Aperti' : s === 'tutti' ? 'Tutti' : statusMeta(s as PurchaseStatus).label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Periodo</span>
        <button onClick={() => setPeriodo('mese')}  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400">Mese</button>
        <button onClick={() => setPeriodo('anno')}  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400">Anno</button>
        <button onClick={() => setPeriodo('tutto')} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-400">Tutto</button>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700" />
        <span className="text-xs text-gray-400">→</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700" />
        <input
          type="text" value={text} onChange={e => setText(e.target.value)}
          placeholder="Cerca…"
          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 w-40 ml-auto"
        />
      </div>

      {/* Totali per categoria */}
      {stats.perCategoria.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Categoria</th>
                <th className="text-right px-4 py-2 font-medium">N.</th>
                <th className="text-right px-4 py-2 font-medium">Previsto</th>
                <th className="text-right px-4 py-2 font-medium">Speso</th>
                <th className="text-right px-4 py-2 font-medium">Totale</th>
              </tr>
            </thead>
            <tbody>
              {stats.perCategoria.map(r => (
                <tr key={r.cat} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                      style={{ backgroundColor: categoryColor(r.cat === 'ND' ? null : r.cat) }}
                    >
                      {r.cat === 'ND' ? 'Nessuna' : categoryLabel(r.cat)}
                    </span>
                  </td>
                  <td className="text-right px-4 py-2 text-gray-500">{r.n}</td>
                  <td className="text-right px-4 py-2 text-blue-700">{formatEuro(r.previsto)}</td>
                  <td className="text-right px-4 py-2 text-green-700">{formatEuro(r.speso)}</td>
                  <td className="text-right px-4 py-2 font-semibold text-gray-800">{formatEuro(r.previsto + r.speso)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-2 text-gray-700">TOTALE</td>
                <td className="text-right px-4 py-2 text-gray-600">{stats.list.length}</td>
                <td className="text-right px-4 py-2 text-blue-800">{formatEuro(stats.previsto)}</td>
                <td className="text-right px-4 py-2 text-green-800">{formatEuro(stats.speso)}</td>
                <td className="text-right px-4 py-2 text-gray-900">{formatEuro(stats.previsto + stats.speso)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Lista acquisti */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : stats.list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-sm">Nessun acquisto. Aggiungine uno!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.list.map(p => (
            <PurchaseRow
              key={p.pur_id}
              purchase={p}
              nQuotes={quotesOf(p.pur_id).length}
              onOpen={() => setDetail(p)}
            />
          ))}
        </div>
      )}

      {showNew && (
        <NewPurchaseModal
          onSave={async p => { await addPurchase(p); setShowNew(false) }}
          onCancel={() => setShowNew(false)}
        />
      )}
      {detail && (
        <PurchaseDetailModal
          purchase={purchases.find(p => p.pur_id === detail.pur_id) ?? detail}
          quotes={quotesOf(detail.pur_id)}
          onUpdate={updatePurchase}
          onDelete={async id => { await deletePurchase(id); setDetail(null) }}
          onMarkPurchased={markPurchased}
          onAddQuote={addQuote}
          onSelectQuote={selectQuote}
          onDeleteQuote={deleteQuote}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

function KpiCard({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
      {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
    </div>
  )
}

function PurchaseRow({ purchase: p, nQuotes, onOpen }: {
  purchase: TbPurchase
  nQuotes: number
  onOpen: () => void
}) {
  const st = statusMeta(p.pur_status)
  const wDays = warrantyDaysLeft(p.pur_warranty_until)
  const isAcq = p.pur_status === 'acquistato'
  const diff = isAcq && p.pur_est_amount != null && p.pur_final_amount != null
    ? p.pur_final_amount - p.pur_est_amount
    : null

  return (
    <div
      onClick={onOpen}
      className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
      style={{ borderLeftColor: categoryColor(p.pur_ws_code), borderLeftWidth: 3 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{p.pur_title}</span>
          {p.pur_code && <span className="font-mono text-xs text-gray-400">{p.pur_code}</span>}
          {p.pur_deductible && (
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
              deducibile
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: st.color }}
          >
            {st.label}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: categoryColor(p.pur_ws_code) }}
          >
            {categoryLabel(p.pur_ws_code)}
          </span>
          {p.prj_label && <span className="text-xs text-gray-500">📂 {p.prj_label}</span>}
          {nQuotes > 0 && <span className="text-xs text-blue-600">📋 {nQuotes} preventiv{nQuotes === 1 ? 'o' : 'i'}</span>}
          {p.pur_target_date && !isAcq && (
            <span className="text-xs text-gray-500">🎯 {fmtDate(p.pur_target_date)}</span>
          )}
          {isAcq && p.pur_purchase_date && (
            <span className="text-xs text-gray-500">🧾 {fmtDate(p.pur_purchase_date)}</span>
          )}
          {wDays !== null && wDays >= 0 && (
            <span className={`text-xs ${wDays <= 60 ? 'text-amber-700' : 'text-gray-400'}`}>
              🛡️ garanzia fino {fmtDate(p.pur_warranty_until)}
            </span>
          )}
        </div>
      </div>

      {/* Importi */}
      <div className="text-right shrink-0">
        {isAcq ? (
          <>
            <div className="text-sm font-semibold text-green-700">{formatEuro(p.pur_final_amount)}</div>
            {diff !== null && diff !== 0 && (
              <div className={`text-xs ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff < 0 ? '▼' : '▲'} {formatEuro(Math.abs(diff))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-blue-700">{formatEuro(p.pur_est_amount)}</div>
            <div className="text-xs text-gray-400">stima</div>
          </>
        )}
      </div>
    </div>
  )
}
