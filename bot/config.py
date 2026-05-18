import os

BOT_TOKEN: str = os.environ["TELEGRAM_BOT_TOKEN"]
WEBHOOK_SECRET: str = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
CRON_SECRET: str = os.environ.get("CRON_SECRET", "")

SUPABASE_URL: str = os.environ.get("SUPABASE_URL") or os.environ["VITE_SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

GROQ_API_KEY: str = os.environ["GROQ_API_KEY"]

# Chat ID dell'utente per il digest mattutino
TELEGRAM_CHAT_ID: int = int(os.environ.get("TELEGRAM_CHAT_ID", "0"))

STORAGE_BUCKET = "tb-attachments"

# Stati conversazione
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
