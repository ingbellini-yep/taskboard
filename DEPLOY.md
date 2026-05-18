# Taskboard — Guida deploy

## Prerequisiti
- Account Vercel (free tier OK)
- Progetto Supabase esistente `dacekxilrahnbwwjovde`
- Bot Telegram creato con @BotFather
- Account Groq (gratuito)

---

## Fase 1 — Database (se non già fatto)

Nel Supabase Dashboard → SQL Editor, eseguire in ordine:
1. `supabase/migrations/001_taskboard_schema.sql`
2. `supabase/migrations/002_bot_sessions.sql`

Poi in Storage → creare bucket `tb-attachments`:
- Public: **No**
- File size limit: 50 MB
- Allowed MIME: `image/*, audio/*, application/pdf`

---

## Fase 2 — Variabili d'ambiente Vercel

Nel dashboard Vercel → Settings → Environment Variables aggiungere:

| Chiave | Valore |
|---|---|
| `SUPABASE_URL` | `https://dacekxilrahnbwwjovde.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(da Supabase → Settings → API)* |
| `TELEGRAM_BOT_TOKEN` | *(da @BotFather)* |
| `TELEGRAM_WEBHOOK_SECRET` | *(stringa casuale ≥32 char)* |
| `TELEGRAM_CHAT_ID` | *(tuo chat_id numerico — ottienilo con @userinfobot)* |
| `GROQ_API_KEY` | *(da console.groq.com)* |

**Nota:** Le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` servono solo al frontend React.

---

## Fase 3 — Deploy su Vercel

```bash
# Installa Vercel CLI se non ce l'hai
npm i -g vercel

# Deploy (prima volta)
cd taskboard/
vercel --prod
```

Vercel rileverà:
- Frontend React → `dist/` (build: `npm run build`)
- Serverless Functions Python → `api/`

---

## Fase 4 — Registra webhook Telegram

Dopo il deploy, ottieni l'URL Vercel (es. `https://taskboard-xyz.vercel.app`) e lancia:

```bash
# Installa dipendenze Python localmente (per lo script)
pip install python-telegram-bot

# Registra webhook
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_WEBHOOK_SECRET=yyy \
  python scripts/setup_webhook.py https://taskboard-xyz.vercel.app
```

Output atteso:
```
Registro webhook: https://taskboard-xyz.vercel.app/api/webhook
✅ Webhook attivo: https://taskboard-xyz.vercel.app/api/webhook
   Bot: @taskboard_yyy_bot (Taskboard)
```

---

## Vercel Cron

Il cron `20 5 * * *` (UTC) corrisponde a:
- **7:20 CEST** (estate, UTC+2) ✓
- **6:20 CET** (inverno, UTC+1) — in inverno modificare a `20 6 * * *`

Modifica in `vercel.json` → `"schedule"` se necessario.

---

## Test rapido bot

1. Apri la chat col bot su Telegram
2. Manda `/start` → deve rispondere con la lista comandi
3. Manda `/oggi` → deve rispondere con il digest (vuoto se DB vuoto)
4. Manda `/task` → deve mostrare la tastiera con i progetti
