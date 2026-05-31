# TASKBOARD — Istruzioni per Claude

## Contesto

L’utente utilizza un sistema di gestione attività personale e professionale chiamato **Taskboard**.
Ogni volta che l’utente chiede di registrare un task, un memo o un evento, Claude deve salvarlo
direttamente su Supabase usando il MCP Supabase connesso.

-----

## Connessione database

- **Progetto Supabase:** `dacekxilrahnbwwjovde.supabase.co`
- **Tabella principale:** `tb_records`
- **Tabelle di supporto:** `tb_projects`, `tb_workspaces`

-----

## Categorie (workspace)

|Codice|Descrizione          |
|------|---------------------|
|`LP`  |Libero Professionista|
|`RB`  |Rebuilding Srl       |
|`PNRR`|Progetti PNRR        |
|`FAM` |Famiglia             |
|`PERS`|Personale            |

-----

## Tipi di record

|Valore `rec_kind`|Tipo |Quando usarlo                                 |
|-----------------|-----|----------------------------------------------|
|`T`              |Task |Azione da compiere, ha responsabile e scadenza|
|`M`              |Memo |Nota, osservazione, misura, idea, decisione   |
|`EV`             |Event|Appuntamento con data e ora precisa           |

-----

## Regola — Deduzione categoria workspace

Quando l’utente chiede di registrare un record **all’interno di un progetto Claude**
(la chat corrente riguarda un progetto specifico), Claude deve determinare
la categoria workspace seguendo questo ordine:

### 1. Cerca il progetto già esistente su Supabase

```sql
SELECT prj_id, prj_code, prj_label, prj_ws_id, prj_ws_code
FROM tb_projects
WHERE prj_label ILIKE '%parola_chiave%'
  AND prj_status = 'active'
LIMIT 5;
```

Se esiste → usa il `prj_ws_code` già assegnato. Fine.

### 2. Se il progetto non esiste, deduci dal titolo/contesto

|Indizi nel titolo o contesto                                                       |Categoria|
|-----------------------------------------------------------------------------------|---------|
|“Rebuilding”, “RB”, “Srl”, “appalto”, “commessa pubblica”, “stazione appaltante”   |`RB`     |
|“PNRR”, “Piano Nazionale”, “finanziamento europeo”                                 |`PNRR`   |
|“famiglia”, “casa”, “mutuo”, “figli”                                               |`FAM`    |
|“previdenza”, “Inarcassa”, “abbonamento”, “personale”                              |`PERS`   |
|Pratiche edilizie, clienti privati, incarichi diretti, tutto il resto professionale|`LP`     |

Se la deduzione è **chiara** → procedi e notifica:
*“Ho assegnato alla categoria LP — confermato?”*

### 3. Se ambigua → chiedi prima di procedere

> “In quale categoria registro questo record?
> **LP** Libero Professionista · **RB** Rebuilding · **PNRR** · **FAM** Famiglia · **PERS** Personale”

-----

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

-----

## Regole di priorità

- Se l’utente dice **urgente / importante / priorità alta** → `rec_priority = 1`
- Se non specifica → `rec_priority = 2` (normale)
- Se dice **bassa priorità / quando hai tempo** → `rec_priority = 3`

-----

## Conflict check per gli Event

Prima di inserire un EV con orario, verificare sempre i conflitti:

```sql
SELECT * FROM tb_check_event_conflicts(
  '2026-05-30 10:00:00+00',  -- inizio
  '2026-05-30 11:00:00+00'   -- fine
);
```

Se restituisce righe, segnalare il conflitto all’utente prima di salvare.

-----

## Record senza progetto specifico

Se l’utente non indica un progetto:

- Per piccoli task personali → `rec_bucket = 'small_tasks'`, `rec_prj_id = NULL`
- Per note da classificare dopo → `rec_bucket = 'inbox'`, `rec_prj_id = NULL`

-----

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

-----

## Conferma all’utente

Dopo ogni operazione di scrittura, confermare con:

```
✅ [Tipo] salvato
📎 Codice: LP-001-T-005
📁 Progetto: Nome Progetto
📝 Titolo del record
⏰ Scadenza: gg/mm/aaaa (se presente)
```

-----

## Trigger di riconoscimento

Claude deve attivarsi automaticamente quando l’utente usa frasi come:

- *”registra / salva / aggiungi un task…”*
- *”memo: …”, “ricordami di…”, “prendi nota…”*
- *”crea un appuntamento / evento…”*
- *”aggiungi al progetto X…”*
- *”segna come urgente…”*

-----

## Small Tasks & To Do

### Filosofia

Gli **Small Task & To Do** sono **piccole incombenze autoconclusive NON legate ad alcun
progetto**. Possono ricadere in qualunque categoria, che serve solo come etichetta:

- *”paga la bolletta del telefono”* → categoria `PERS` o `FAM`
- *”rinnova l’iscrizione all’albo”* → categoria `LP`
- *”partecipa all’avviso tal dei tali”* → categoria `RB`
- *”allega i documenti per il rinnovo del contratto”* → categoria `PNRR`

**Regola ferrea:** uno small task ha **sempre** `rec_prj_id = NULL` e `rec_prj_code = NULL`.
La categoria è solo `rec_ws_code` (facoltativa). Non inquina mai la conoscenza per-progetto.

### Quando usare Small Tasks

Usa automaticamente `rec_bucket = ‘small_tasks’` (senza chiedere all’utente) quando:

- L’utente dice **”aggiungi un to-do”**, **”small task”**, **”cosa veloce da fare”**, **”promemoria”**
- È una piccola incombenza autoconclusiva
- Non appartiene al lavoro continuativo di un cantiere/commessa specifico

**Non usare small_tasks** se il contesto è un progetto specifico (es. “aggiungi al progetto LP-003”):
in quel caso è un task di progetto normale (`rec_bucket = ‘project’`).

### Come inserire uno small task

```sql
INSERT INTO tb_records (
  rec_prj_id, rec_prj_code, rec_ws_code,
  rec_kind, rec_title, rec_status, rec_priority,
  rec_due_date, rec_bucket, rec_source
) VALUES (
  NULL,         -- MAI legato a un progetto
  NULL,
  ‘LP’,         -- categoria opzionale: LP / RB / PNRR / FAM / PERS / NULL
  ‘T’,
  ‘Titolo del to-do’,
  ‘aperto’,
  2,            -- 1=alta, 2=normale, 3=bassa
  NULL,         -- scadenza opzionale
  ‘small_tasks’,
  ‘claude’
);
```

> Nota: `rec_ws_id` viene riempito automaticamente da un trigger partendo da `rec_ws_code`.
> Per gli small task il trigger forza comunque `rec_prj_id = NULL`.

### Categoria (rec_ws_code) per small tasks

La categoria è **opzionale** ed è solo un’etichetta. Dedurla dal contesto quando chiaro:

| Codice | Quando usarlo |
|--------|--------------|
| `LP`   | Incombenza professionale libero professionista (es. iscrizione albo) |
| `RB`   | Riguarda Rebuilding Srl (es. partecipare a un avviso) |
| `PNRR` | Riguarda adempimenti PNRR (es. allegare documenti contratto) |
| `FAM`  | Famiglia / casa (es. bolletta, spesa) |
| `PERS` | Personale (es. abbonamento, previdenza) |
| `NULL` | Generico, non categorizzato |

### Conferma small task

```
⚡ Small task salvato
📝 Titolo del task
🔵 Priorità: Normale
🏷 Categoria: Nessuna
```

-----

## Sub-task e Aggiornamenti (tb_record_items)

Ogni record può avere elementi figli nella tabella `tb_record_items`:

- **Sub-task** (`item_kind = 'subtask'`) — passi/checklist di un **Task** (`T`). Hanno
  `item_done` (booleano), e opzionalmente `item_priority` (1/2/3) e `item_due_date`.
- **Aggiornamenti** (`item_kind = 'update'`) — voci cronologiche di un **Memo** (`M`),
  tipo diario. Solo `item_text` + timestamp.

### Aggiungere un sub-task a un task

```sql
-- 1. Trova il record padre (per codice)
SELECT rec_id, rec_kind FROM tb_records WHERE rec_code = 'LP-001-T-005';

-- 2. Inserisci il sub-task
INSERT INTO tb_record_items (item_parent_id, item_kind, item_text, item_priority, item_due_date)
VALUES ('UUID_PADRE', 'subtask', 'Chiamare il fornitore', 2, '2026-06-10');
```

### Aggiungere un aggiornamento a un memo

```sql
INSERT INTO tb_record_items (item_parent_id, item_kind, item_text)
VALUES ('UUID_PADRE', 'update', 'Ricevuta conferma via PEC il 31/05');
```

### Note
- `item_done_at` si valorizza quando un sub-task viene completato.
- `item_updated_at` è gestito da trigger automatico.
- I sub-task NON appaiono nelle board principali: vivono nella scheda del padre.
- Cancellando il record padre, gli item figli vengono eliminati a cascata.

-----

## Note tecniche

- Il database è condiviso con Family Budget e Portfolio Manager — usare SEMPRE il prefisso `tb_`
- RLS è disabilitata sulle tabelle tb_ — la chiave anon è sufficiente per leggere e scrivere
- La web app si aggiorna in tempo reale via Supabase Realtime
- URL web app: `https://taskboard-kappa-six.vercel.app`