import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbPurchase, TbPurchaseQuote, PurchaseStatus, WorkspaceCode } from '../types'

export const PURCHASE_STATUSES: { value: PurchaseStatus; label: string; color: string }[] = [
  { value: 'da_valutare', label: 'Da valutare', color: '#757575' },
  { value: 'preventivi',  label: 'Preventivi',  color: '#1565C0' },
  { value: 'approvato',   label: 'Approvato',   color: '#E65100' },
  { value: 'acquistato',  label: 'Acquistato',  color: '#2E7D32' },
  { value: 'annullato',   label: 'Annullato',   color: '#B71C1C' },
]

export function statusMeta(s: PurchaseStatus) {
  return PURCHASE_STATUSES.find(x => x.value === s) ?? PURCHASE_STATUSES[0]
}

export function formatEuro(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

export interface PurchaseFilters {
  cats: Set<string>
  status: PurchaseStatus | 'tutti' | 'aperti'
  from: string   // YYYY-MM-DD
  to: string
  text: string
}

export function usePurchases() {
  const [purchases, setPurchases] = useState<TbPurchase[]>([])
  const [quotes, setQuotes] = useState<TbPurchaseQuote[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: pur }, { data: quo }] = await Promise.all([
      supabase
        .from('tb_purchases')
        .select('*, tb_projects!pur_prj_id ( prj_label )')
        .order('pur_target_date', { ascending: true, nullsFirst: false })
        .order('pur_created_at', { ascending: false }),
      supabase.from('tb_purchase_quotes').select('*').order('quo_amount', { ascending: true }),
    ])

    const normalized = (pur ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      prj_label: (p.tb_projects as { prj_label: string } | null)?.prj_label ?? null,
    })) as TbPurchase[]

    setPurchases(normalized)
    setQuotes((quo ?? []) as TbPurchaseQuote[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const ch = supabase
      .channel('tb_purchases_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_purchases' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_purchase_quotes' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetch])

  // ─── CRUD acquisti ─────────────────────────────────────────────────────────

  async function addPurchase(p: Partial<TbPurchase>) {
    const { data } = await supabase.from('tb_purchases').insert({
      pur_title:           p.pur_title,
      pur_ws_code:         p.pur_ws_code ?? null,
      pur_prj_id:          p.pur_prj_id ?? null,
      pur_status:          p.pur_status ?? 'da_valutare',
      pur_priority:        p.pur_priority ?? 2,
      pur_est_amount:      p.pur_est_amount ?? null,
      pur_target_date:     p.pur_target_date ?? null,
      pur_warranty_months: p.pur_warranty_months ?? null,
      pur_deductible:      p.pur_deductible ?? false,
      pur_url:             p.pur_url ?? null,
      pur_notes:           p.pur_notes ?? null,
      pur_source:          'web',
    }).select('*')
    if (data?.[0]) setPurchases(prev => [...prev, data[0] as TbPurchase])
  }

  async function updatePurchase(id: string, patch: Partial<TbPurchase>) {
    setPurchases(prev => prev.map(p => p.pur_id === id ? { ...p, ...patch } as TbPurchase : p))
    await supabase.from('tb_purchases').update(patch).eq('pur_id', id)
    fetch()  // ricarica per avere i campi calcolati dal trigger (garanzia, codice)
  }

  async function deletePurchase(id: string) {
    setPurchases(prev => prev.filter(p => p.pur_id !== id))
    await supabase.from('tb_purchases').delete().eq('pur_id', id)
  }

  /** Segna come acquistato: importo finale, data, fornitore. */
  async function markPurchased(id: string, opts: {
    finalAmount: number | null
    purchaseDate: string
    vendor?: string | null
    invoiceRef?: string | null
    warrantyMonths?: number | null
  }) {
    await updatePurchase(id, {
      pur_status:          'acquistato',
      pur_final_amount:    opts.finalAmount,
      pur_purchase_date:   opts.purchaseDate,
      pur_vendor:          opts.vendor ?? null,
      pur_invoice_ref:     opts.invoiceRef ?? null,
      ...(opts.warrantyMonths !== undefined ? { pur_warranty_months: opts.warrantyMonths } : {}),
    } as Partial<TbPurchase>)
  }

  // ─── Preventivi ────────────────────────────────────────────────────────────

  async function addQuote(purId: string, q: { vendor: string; amount: number; url?: string; notes?: string }) {
    const { data } = await supabase.from('tb_purchase_quotes').insert({
      quo_pur_id: purId,
      quo_vendor: q.vendor,
      quo_amount: q.amount,
      quo_url:    q.url || null,
      quo_notes:  q.notes || null,
    }).select('*')
    if (data?.[0]) setQuotes(prev => [...prev, data[0] as TbPurchaseQuote])
    // Se l'acquisto era 'da_valutare', passa a 'preventivi'
    const pur = purchases.find(p => p.pur_id === purId)
    if (pur && pur.pur_status === 'da_valutare') {
      await updatePurchase(purId, { pur_status: 'preventivi' })
    }
  }

  /** Marca un preventivo come scelto (esclusivo) e allinea fornitore/stima. */
  async function selectQuote(purId: string, quoId: string) {
    setQuotes(prev => prev.map(q =>
      q.quo_pur_id === purId ? { ...q, quo_selected: q.quo_id === quoId } : q
    ))
    await supabase.from('tb_purchase_quotes').update({ quo_selected: false }).eq('quo_pur_id', purId)
    await supabase.from('tb_purchase_quotes').update({ quo_selected: true }).eq('quo_id', quoId)
    const q = quotes.find(x => x.quo_id === quoId)
    if (q) await updatePurchase(purId, { pur_vendor: q.quo_vendor })
  }

  async function deleteQuote(quoId: string) {
    setQuotes(prev => prev.filter(q => q.quo_id !== quoId))
    await supabase.from('tb_purchase_quotes').delete().eq('quo_id', quoId)
  }

  function quotesOf(purId: string) {
    return quotes.filter(q => q.quo_pur_id === purId)
  }

  return {
    purchases, quotes, loading,
    addPurchase, updatePurchase, deletePurchase, markPurchased,
    addQuote, selectQuote, deleteQuote, quotesOf,
    refetch: fetch,
  }
}

/** Applica i filtri e calcola i totali. */
export function usePurchaseStats(purchases: TbPurchase[], filters: PurchaseFilters) {
  return useMemo(() => {
    let list = purchases

    if (filters.cats.size > 0) {
      list = list.filter(p => filters.cats.has(p.pur_ws_code ?? '__none__'))
    }
    if (filters.status === 'aperti') {
      list = list.filter(p => p.pur_status !== 'acquistato' && p.pur_status !== 'annullato')
    } else if (filters.status !== 'tutti') {
      list = list.filter(p => p.pur_status === filters.status)
    }
    if (filters.text.trim()) {
      const q = filters.text.trim().toLowerCase()
      list = list.filter(p =>
        p.pur_title.toLowerCase().includes(q) ||
        (p.pur_vendor ?? '').toLowerCase().includes(q) ||
        (p.pur_notes ?? '').toLowerCase().includes(q) ||
        (p.pur_code ?? '').toLowerCase().includes(q)
      )
    }
    // Periodo: usa data acquisto se acquistato, altrimenti data prevista
    if (filters.from || filters.to) {
      list = list.filter(p => {
        const d = p.pur_purchase_date ?? p.pur_target_date
        if (!d) return false
        if (filters.from && d < filters.from) return false
        if (filters.to && d > filters.to) return false
        return true
      })
    }

    const acquistati = list.filter(p => p.pur_status === 'acquistato')
    const daAcquistare = list.filter(p => p.pur_status !== 'acquistato' && p.pur_status !== 'annullato')

    const speso = acquistati.reduce((s, p) => s + (p.pur_final_amount ?? 0), 0)
    const previsto = daAcquistare.reduce((s, p) => s + (p.pur_est_amount ?? 0), 0)
    const stimatoAcq = acquistati.reduce((s, p) => s + (p.pur_est_amount ?? 0), 0)
    const scostamento = speso - stimatoAcq   // <0 = risparmiato

    // Totali per categoria
    const perCategoria = new Map<string, { previsto: number; speso: number; n: number }>()
    for (const p of list) {
      const key = p.pur_ws_code ?? 'ND'
      const cur = perCategoria.get(key) ?? { previsto: 0, speso: 0, n: 0 }
      cur.n += 1
      if (p.pur_status === 'acquistato') cur.speso += p.pur_final_amount ?? 0
      else if (p.pur_status !== 'annullato') cur.previsto += p.pur_est_amount ?? 0
      perCategoria.set(key, cur)
    }

    return {
      list,
      speso, previsto, scostamento, stimatoAcq,
      nAcquistati: acquistati.length,
      nDaAcquistare: daAcquistare.length,
      perCategoria: Array.from(perCategoria.entries())
        .map(([cat, v]) => ({ cat, ...v }))
        .sort((a, b) => (b.speso + b.previsto) - (a.speso + a.previsto)),
    }
  }, [purchases, filters])
}

export type { WorkspaceCode }
