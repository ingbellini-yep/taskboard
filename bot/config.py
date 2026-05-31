"""
Configurazione da variabili d'ambiente.
Tutti i valori sono lazy (os.environ.get con default ""):
- non sollevano KeyError all'import (necessario per Vercel cold start)
- sollevano un errore chiaro solo quando il valore vuoto viene usato
"""
import os

# ── Telegram ──────────────────────────────────────────────────────────────────
BOT_TOKEN        = os.environ.get("TELEGRAM_BOT_TOKEN", "")
WEBHOOK_SECRET   = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
CRON_SECRET      = os.environ.get("CRON_SECRET", "")
TELEGRAM_CHAT_ID = int(os.environ.get("TELEGRAM_CHAT_ID", "0"))

# ── Supabase ──────────────────────────────────────────────────────────────────
# Supporta sia SUPABASE_URL (backend) sia VITE_SUPABASE_URL (frontend = stessa URL)
SUPABASE_URL        = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# ── Groq ──────────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# ── Storage ───────────────────────────────────────────────────────────────────
STORAGE_BUCKET = "tb-attachments"

# ── Stati conversazione ───────────────────────────────────────────────────────
IDLE          = "idle"
TASK_PROJECT  = "task_project"
TASK_TITLE    = "task_title"
TASK_DUE      = "task_due"
MEMO_PROJECT  = "memo_project"
MEMO_CONTENT  = "memo_content"
MEMO_CONFIRM  = "memo_confirm"
EV_PROJECT    = "ev_project"
EV_TITLE      = "ev_title"
EV_START      = "ev_start"
EV_DURATION   = "ev_duration"
EV_ALERT      = "ev_alert"
PROJ_SEARCH   = "proj_search"
SMALL_TITLE    = "small_title"
SMALL_DUE      = "small_due"
ITEM_CODE      = "item_code"
ITEM_TEXT      = "item_text"
