export type WorkspaceCode = 'LP' | 'RB' | 'PNRR' | 'FAM' | 'PERS'
export type RecordKind = 'T' | 'M' | 'EV'
export type RecordStatus = 'aperto' | 'in_progress' | 'sospeso' | 'chiuso' | 'archiviato'
export type RecordBucket = 'project' | 'inbox' | 'small_tasks'
export type GroupBy = 'workspace' | 'priority' | 'due_date' | 'project'

export interface Workspace {
  ws_id: string
  ws_code: WorkspaceCode
  ws_label: string
  ws_color: string
  ws_icon: string
  ws_sort_order: number
  ws_active: boolean
}

export interface Project {
  prj_id: string
  prj_code: string
  prj_ws_id: string
  prj_ws_code: WorkspaceCode
  prj_label: string
  prj_client: string | null
  prj_status: string
  prj_priority: number
  prj_due_date: string | null
  prj_updated_at: string
}

export type PurchaseStatus = 'da_valutare' | 'preventivi' | 'approvato' | 'acquistato' | 'annullato'

export interface TbPurchase {
  pur_id: string
  pur_code: string | null
  pur_title: string
  pur_ws_code: WorkspaceCode | null
  pur_ws_id: string | null
  pur_prj_id: string | null
  pur_prj_code: string | null
  pur_status: PurchaseStatus
  pur_priority: number
  pur_est_amount: number | null
  pur_final_amount: number | null
  pur_target_date: string | null
  pur_purchase_date: string | null
  pur_vendor: string | null
  pur_warranty_months: number | null
  pur_warranty_until: string | null
  pur_invoice_ref: string | null
  pur_deductible: boolean
  pur_url: string | null
  pur_notes: string | null
  pur_created_at: string
  pur_updated_at: string
  // joined
  prj_label?: string | null
}

export interface TbPurchaseQuote {
  quo_id: string
  quo_pur_id: string
  quo_vendor: string
  quo_amount: number
  quo_url: string | null
  quo_notes: string | null
  quo_selected: boolean
  quo_date: string | null
  quo_created_at: string
}

export type RecordItemKind = 'subtask' | 'update'

export interface TbRecordItem {
  item_id: string
  item_parent_id: string
  item_kind: RecordItemKind
  item_text: string
  item_done: boolean
  item_priority: number | null
  item_due_date: string | null
  item_done_at: string | null
  item_sort: number
  item_created_at: string
  item_updated_at: string
}

export interface TbRecord {
  rec_id: string
  rec_prj_id: string | null
  rec_ws_id: string | null
  rec_prj_code: string | null
  rec_ws_code: WorkspaceCode | null
  rec_code: string | null
  rec_kind: RecordKind
  rec_title: string
  rec_body: string | null
  rec_sub_label: string | null
  rec_status: RecordStatus
  rec_priority: number
  rec_due_date: string | null
  rec_event_start: string | null
  rec_event_end: string | null
  rec_tags: string[] | null
  rec_flagged: boolean
  rec_bucket: RecordBucket
  rec_created_at: string
  rec_updated_at: string
  rec_done_at: string | null
  rec_hours: number | null
  rec_google_event_id: string | null
  // joined via view
  prj_label: string | null
  ws_label: string | null
  ws_color: string | null
  ws_icon: string | null
}
