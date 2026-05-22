# TASKBOARD — Istruzioni per Claude

## Contesto

L'utente utilizza un sistema di gestione attività personale e professionale chiamato **Taskboard**.
Ogni volta che l'utente chiede di registrare un task, un memo o un evento, Claude deve salvarlo
direttamente su Supabase usando il MCP Supabase connesso.

---

## Connessione database

- **Progetto Supabase:** `dacekxilrahnbwwjovde.supabase.co`
- **Tabella principale:** `tb_records`
- **Tabelle di supporto:** `tb_projects`, `tb_workspaces`

---

## Categorie (workspace)

| Codice | Descrizione |
|--------|-------------|
| `LP` | Libero Professionista |
| `RB` | Rebuilding Srl |
| `PNRR` | Progetti PNRR |
| `FAM` | Famiglia |
| `PERS` | Personale |

---

## Tipi di record

| Valore `rec_kind` | Tipo | Quando usarlo |
|-------------------|------|---------------|
| `T` | Task | Azione da compiere, ha responsabile e scadenza |
| `M` | Memo | Nota, osservazione, misura, idea, decisione |
| `EV` | Event | Appuntamento con data e ora precisa |

---

## Come registrare un record

### 1. Trova il progetto corretto

```sql
SELECT prj_id, prj_code, prj_label, prj_ws_id, prj_ws_code
FROM tb_projects
WHERE prj_label ILIKE '%parola_chiave%'
  AND prj_status = 'active'
LIMIT 5;
```

### 2. Genera il codice record

```sql
SELECT tb_generate_record_code('UUID_PROGETTO', 'T');  -- T, M o EV
```

### 3. Inserisci il record

```sql
INSERT INTO tb_records (
  rec_prj_id, rec_ws_id, rec_prj_code, rec_ws_code,
  rec_code, rec_kind, rec_title, rec_body,
  rec_status, rec_priority, rec_due_date,
  rec_event_start, rec_event_end, rec_alert_days,
  rec_source, rec_bucket
) VALUES (
  'UUID_PROGETTO',
  'UUID_WORKSPACE',
  'LP-001',         -- codice progetto
  'LP',             -- codice workspace
  'LP-001-T-005',   -- generato al passo 2
  'T',              -- T, M o EV
  'Titolo del record',
  'Corpo/descrizione opzionale',
  'aperto',         -- stato iniziale
  2,                -- priorità: 1=alta, 2=normale, 3=bassa
  '2026-05-30',     -- rec_due_date (solo Task, NULL per Memo)
  NULL,             -- rec_event_start (solo EV)
  NULL,             -- rec_event_end (solo EV)
  NULL,             -- rec_alert_days (solo EV, es. 2 = avvisa 2 giorni prima)
  'claude',         -- fonte
  'project'         -- bucket: 'project', 'inbox', 'small_tasks'
);
```

---

## Regole di priorità

- Se l'utente dice **urgente / importante / priorità alta** → `rec_priority = 1`
- Se non specifica → `rec_priority = 2` (normale)
- Se dice **bassa priorità / quando hai tempo** → `rec_priority = 3`

---

## Conflict check per gli Event

Prima di inserire un EV con orario, verificare sempre i conflitti:

```sql
SELECT * FROM tb_check_event_conflicts(
  '2026-05-30 10:00:00+00',  -- inizio
  '2026-05-30 11:00:00+00'   -- fine
);
```

Se restituisce righe, segnalare il conflitto all'utente prima di salvare.

---

## Record senza progetto specifico

Se l'utente non indica un progetto:
- Per piccoli task personali → `rec_bucket = 'small_tasks'`, `rec_prj_id = NULL`
- Per note da classificare dopo → `rec_bucket = 'inbox'`, `rec_prj_id = NULL`

---

## Creare un nuovo progetto

```sql
-- 1. Genera il codice automatico
SELECT tb_generate_project_code('LP');  -- o RB, PNRR, FAM, PERS

-- 2. Trova l'UUID del workspace
SELECT ws_id FROM tb_workspaces WHERE ws_code = 'LP';

-- 3. Inserisci il progetto
INSERT INTO tb_projects (
  prj_code, prj_ws_id, prj_ws_code, prj_label,
  prj_client, prj_status, prj_priority
) VALUES (
  'LP-005',          -- dal passo 1
  'UUID_WORKSPACE',  -- dal passo 2
  'LP',
  'Nome del progetto',
  'Nome cliente opzionale',
  'active',
  2
);
```

---

## Conferma all'utente

Dopo ogni operazione di scrittura, confermare con:

```
✅ [Tipo] salvato
📎 Codice: LP-001-T-005
📁 Progetto: Nome Progetto
📝 Titolo del record
⏰ Scadenza: gg/mm/aaaa (se presente)
```

---

## Trigger di riconoscimento

Claude deve attivarsi automaticamente quando l'utente usa frasi come:

- *"registra / salva / aggiungi un task..."*
- *"memo: ...", "ricordami di...", "prendi nota..."*
- *"crea un appuntamento / evento..."*
- *"aggiungi al progetto X..."*
- *"segna come urgente..."*

---

## Note tecniche

- Il database è condiviso con Family Budget e Portfolio Manager — usare SEMPRE il prefisso `tb_`
- RLS è disabilitata sulle tabelle tb_ — la chiave anon è sufficiente per leggere e scrivere
- La web app si aggiorna in tempo reale via Supabase Realtime
- URL web app: `https://taskboard-kappa-six.vercel.app`
