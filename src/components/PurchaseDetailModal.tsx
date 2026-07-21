import { useEffect, useState } from 'react'
import type { TbPurchase, TbPurchaseQuote, PurchaseStatus } from '../types'
import { PURCHASE_STATUSES, statusMeta, formatEuro } from '../hooks/usePurchases'
import { categoryColor, categoryLabel } from '../hooks/useSmallTasks'

interface Props {
  purchase: TbPurchase
  quotes: TbPurchaseQuote[]
  onUpdate: (id: string, patch: Partial<TbPurchase>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onMarkPurchased: (id: string, opts: {
    finalAmount: number | null; purchaseDate: string
    vendor?: string | null; invoiceRef?: string | null; warrantyMonths?: number | null
  }) => Promise<void>
  onAddQuote: (purId: string, q: { vendor: string; amount: number; url?: string; notes?: string }) => Promise<void>
  onSelectQuote: (purId: string, quoId: string) => Promise<void>
  onDeleteQuote: (quoId: string) => Promise<void>
  onClose: () => void
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PurchaseDetailModal({
  purchase: p, quotes, onUpdate, onDelete, onMarkPurchased,
  onAddQuote, onSelectQuote, onDeleteQuote, onClose,
}: Props) {
  const [showBuy, setShowBuy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // form nuovo preventivo
  const [qVendor, setQVendor] = useState('')
  const [qAmount, setQAmount] = useState('')
  const [qUrl, setQUrl] = useState('')

  // form acquisto
  const best = quotes.find(q => q.quo_selected) ?? quotes[0]
  const [bAmount, setBAmount] = useState(String(best?.quo_amount ?? p.pur_est_amount ?? ''))
  const [bDate, setBDate] = useState(new Date().toISOString().slice(0, 10))
  const [bVendor, setBVendor] = useState(p.pur_vendor ?? best?.quo_vendor ?? '')
  const [bInvoice, setBInvoice] = useState(p.pur_invoice_ref ?? '')
  const [bWarranty, setBWarranty] = useState(String(p.pur_warranty_months ?? ''))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const st = statusMeta(p.pur_status)
  const isAcq = p.pur_status === 'acquistato'
  const diff = isAcq && p.pur_est_amount != null && p.pur_final_amount != null
    ? p.pur_final_amount - p.pur_est_amount : null
  const minQuote = quotes.length ? Math.min(...quotes.map(q => q.quo_amount)) : null

  async function handleAddQuote() {
    if (!qVendor.trim() || !qAmount) return
    await onAddQuote(p.pur_id, {
      vendor: qVendor.trim(),
      amount: parseFloat(qAmount.replace(',', '.')),
      url: qUrl.trim() || undefined,
    })
    setQVendor(''); setQAmount(''); setQUrl('')
  }

  async function handleBuy() {
    await onMarkPurchased(p.pur_id, {
      finalAmount:    bAmount ? parseFloat(bAmount.replace(',', '.')) : null,
      purchaseDate:   bDate,
      vendor:         bVendor.trim() || null,
      invoiceRef:     bInvoice.trim() || null,
      warrantyMonths: bWarranty ? parseInt(bWarranty, 10) : null,
    })
    setShowBuy(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderLeft: `5px solid ${categoryColor(p.pur_ws_code)}` }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded text-white font-medium" style={{ backgroundColor: categoryColor(p.pur_ws_code) }}>
                {categoryLabel(p.pur_ws_code)}
              </span>
              {p.pur_code && <span className="font-mono text-xs text-gray-400">{p.pur_code}</span>}
              <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: st.color }}>
                {st.label}
              </span>
            </div>
            <h2 className="font-bold text-gray-900 text-base mt-1 leading-snug">{p.pur_title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 border-t border-gray-100">
          {/* Importi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Stimato</div>
              <div className="text-lg font-bold text-blue-700">{formatEuro(p.pur_est_amount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                {isAcq ? 'Pagato' : minQuote !== null ? 'Miglior preventivo' : 'Verificato'}
              </div>
              <div className={`text-lg font-bold ${isAcq ? 'text-green-700' : 'text-gray-700'}`}>
                {isAcq ? formatEuro(p.pur_final_amount) : formatEuro(minQuote)}
              </div>
              {diff !== null && diff !== 0 && (
                <div className={`text-xs ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {diff < 0 ? '▼ risparmiati ' : '▲ extra '}{formatEuro(Math.abs(diff))}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Info label="Data prevista" value={fmtDate(p.pur_target_date)} />
            {isAcq && <Info label="Data acquisto" value={fmtDate(p.pur_purchase_date)} />}
            {p.pur_vendor && <Info label="Fornitore" value={p.pur_vendor} />}
            {p.pur_invoice_ref && <Info label="Fattura" value={p.pur_invoice_ref} />}
            {p.pur_warranty_until && <Info label="Garanzia fino a" value={fmtDate(p.pur_warranty_until)} />}
            {p.prj_label && <Info label="Progetto" value={p.prj_label} />}
            {p.pur_deductible && <Info label="Fiscale" value="Deducibile / detraibile" />}
          </div>

          {p.pur_url && (
            <a href={p.pur_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">
              🔗 {p.pur_url}
            </a>
          )}

          {p.pur_notes && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.pur_notes}</p>
            </div>
          )}

          {/* Preventivi */}
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Preventivi</span>
              {quotes.length > 0 && <span className="text-xs text-gray-500">{quotes.length}</span>}
            </div>

            {quotes.map(q => {
              const isMin = q.quo_amount === minQuote
              return (
                <div key={q.quo_id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border group ${
                  q.quo_selected ? 'border-green-300 bg-green-50' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() => onSelectQuote(p.pur_id, q.quo_id)}
                    className={`w-4 h-4 rounded-full border-2 shrink-0 ${q.quo_selected ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}
                    title="Scegli questo preventivo"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{q.quo_vendor}</span>
                      {isMin && quotes.length > 1 && <span className="text-xs text-green-600">più basso</span>}
                    </div>
                    {q.quo_url && (
                      <a href={q.quo_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-500 hover:underline truncate block">
                        {q.quo_url}
                      </a>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 shrink-0">{formatEuro(q.quo_amount)}</span>
                  <button
                    onClick={() => onDeleteQuote(q.quo_id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              )
            })}

            {/* Aggiungi preventivo */}
            <div className="flex gap-2 flex-wrap items-center">
              <input
                value={qVendor} onChange={e => setQVendor(e.target.value)}
                placeholder="Fornitore"
                className="border border-gray-200 rounded px-2 py-1.5 text-xs flex-1 min-w-[110px] focus:outline-none focus:border-blue-500"
              />
              <input
                value={qAmount} onChange={e => setQAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddQuote() }}
                placeholder="€" inputMode="decimal"
                className="border border-gray-200 rounded px-2 py-1.5 text-xs w-20 focus:outline-none focus:border-blue-500"
              />
              <input
                value={qUrl} onChange={e => setQUrl(e.target.value)}
                placeholder="link (opz.)"
                className="border border-gray-200 rounded px-2 py-1.5 text-xs flex-1 min-w-[100px] focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddQuote}
                disabled={!qVendor.trim() || !qAmount}
                className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-800 disabled:opacity-40 font-medium"
              >
                + Aggiungi
              </button>
            </div>
          </div>

          {/* Cambio stato rapido */}
          {!isAcq && (
            <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Stato</span>
              {PURCHASE_STATUSES.filter(s => s.value !== 'acquistato').map(s => (
                <button
                  key={s.value}
                  onClick={() => onUpdate(p.pur_id, { pur_status: s.value as PurchaseStatus })}
                  className="text-xs px-2.5 py-1 rounded-full border transition-all"
                  style={p.pur_status === s.value
                    ? { backgroundColor: s.color, color: 'white', borderColor: s.color }
                    : { backgroundColor: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Form acquisto */}
          {showBuy && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-3 flex flex-col gap-2">
              <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Registra acquisto</span>
              <div className="flex gap-2 flex-wrap">
                <input value={bAmount} onChange={e => setBAmount(e.target.value)} placeholder="Importo €" inputMode="decimal"
                  className="border border-gray-200 rounded px-2 py-1.5 text-xs w-24 bg-white" />
                <input type="date" value={bDate} onChange={e => setBDate(e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1.5 text-xs bg-white" />
                <input value={bVendor} onChange={e => setBVendor(e.target.value)} placeholder="Fornitore"
                  className="border border-gray-200 rounded px-2 py-1.5 text-xs flex-1 min-w-[100px] bg-white" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <input value={bInvoice} onChange={e => setBInvoice(e.target.value)} placeholder="N. fattura/scontrino"
                  className="border border-gray-200 rounded px-2 py-1.5 text-xs flex-1 min-w-[120px] bg-white" />
                <input value={bWarranty} onChange={e => setBWarranty(e.target.value)} placeholder="Garanzia (mesi)" type="number" min="0"
                  className="border border-gray-200 rounded px-2 py-1.5 text-xs w-32 bg-white" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowBuy(false)} className="text-xs text-gray-500 px-2 py-1">Annulla</button>
                <button onClick={handleBuy} className="text-xs bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-800 font-medium">
                  Conferma acquisto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          {confirmDelete ? (
            <>
              <span className="text-xs text-gray-600 mr-auto">Eliminare definitivamente?</span>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-gray-600">Annulla</button>
              <button onClick={() => onDelete(p.pur_id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700">
                Elimina
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-gray-500 mr-auto"
              >
                🗑 Elimina
              </button>
              {!isAcq && (
                <button
                  onClick={() => setShowBuy(v => !v)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-700 text-white rounded-lg hover:bg-green-800"
                >
                  ✓ Segna come acquistato
                </button>
              )}
              {isAcq && (
                <button
                  onClick={() => onUpdate(p.pur_id, { pur_status: 'approvato', pur_final_amount: null, pur_purchase_date: null })}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  ↩ Annulla acquisto
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  )
}
