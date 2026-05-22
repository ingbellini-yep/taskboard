# PROMPT CLAUDE CODE — Taskboard REV02b

# Design fedele allo screenshot AppScript originale

## Contesto

Modifica la web app React esistente nel progetto `taskboard`.
Il database Supabase è `dacekxilrahnbwwjovde`.
La colonna `rec_hours NUMERIC(6,2)` è già presente in `tb_records`.

-----

## STEP 0 — SQL da eseguire prima di tutto

```sql
UPDATE tb_workspaces SET ws_color = '#1565C0' WHERE ws_code = 'LP';
UPDATE tb_workspaces SET ws_color = '#283593' WHERE ws_code = 'RB';
UPDATE tb_workspaces SET ws_color = '#2E7D32' WHERE ws_code = 'PNRR';
UPDATE tb_workspaces SET ws_color = '#E65100' WHERE ws_code = 'FAM';
UPDATE tb_workspaces SET ws_color = '#6A1B9A' WHERE ws_code = 'PERS';
```

-----

## MODIFICA 1 — Redesign UI completo tema chiaro

### Font

In `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

In `index.css`:

```css
body { font-family: 'Inter', system-ui, sans-serif; }
```

-----

### Palette colori globale

```
Sfondo pagina:          #F5F5F5
Sfondo card:            #FFFFFF
Bordo card:             #E0E0E0
Bordo card hover:       #BDBDBD
Ombra card:             0 1px 3px rgba(0,0,0,0.08)
Header sfondo:          #1E1E2E
Header testo primario:  #FFFFFF font-bold
Header testo sec:       #9E9E9E text-sm
Alert bar sfondo:       #C62828
Alert bar testo:        #FFFFFF text-sm
Stats bar sfondo:       #EEEEEE
Stats numero:           #212121 text-2xl font-bold
Stats label:            #757575 text-xs uppercase tracking-wide
Testo titolo card:      #212121 font-semibold text-sm
Testo progetto card:    #616161 text-xs
Codice record:          #9E9E9E font-mono text-xs
Data scaduta:           #C62828
Data normale:           #616161
Bottone primario:       #1565C0 sfondo, #FFFFFF testo
Tab attiva:             bordo-inferiore 2px #1565C0, testo #1565C0 font-medium
Tab inattiva:           #616161
```

-----

### Layout pagina completo

```
┌──────────────────────────────────────────────────────────┐
│ HEADER (#1E1E2E)                                         │
│  "Task Board · Ing. Epifanio Bellini"   "Aggiornato..."  │
│  "Ordine Ingegneri AG n. 1244 · ..."                     │
│  "v2 · N progetti attivi"                                │
├──────────────────────────────────────────────────────────┤
│ ALERT BAR (#C62828) — solo se ci sono urgenti            │
│  "🔴 2 urgenti → LP-009 · Titolo | PNRR-001 · Titolo"   │
├──────────────────────────────────────────────────────────┤
│ STATS BAR (#EEEEEE)                                      │
│  2 URGENTI | 6 ALTA | 9 NORMALE | 2 SOSPESI | 19 TOTALI │
├──────────────────────────────────────────────────────────┤
│ TABS (sfondo bianco, bordo-bottom #E0E0E0)               │
│  [Aperti (19)]  [Completati]  [Ore]                      │
├──────────────────────────────────────────────────────────┤
│ FILTRI                                                   │
│  CAT:      [Tutte][LP][RB][PNRR][PER][FAM]              │
│  PRIORITÀ: [Tutte][Urg.][Alta][Norm.][Sosp.]            │
│  [Tutti i progetti ▼]  ORDINA[▼]  19 task  [+Nuovo Task]│
├──────────────────────────────────────────────────────────┤
│ BOARD (sfondo #F5F5F5)                                   │
│  [LP] Libera Professione ──────────────────── 10         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │  card   │  │  card   │  │  card   │                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                          │
│  [RB] Rebuilding ──────────────────────────── 7          │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

-----

### Header scuro

- Sfondo `#1E1E2E`, padding `16px 20px`
- Riga 1: sinistra “Task Board · Ing. Epifanio Bellini” bold bianco | destra “Aggiornato gg/mm/aaaa hh:mm” #9E9E9E text-xs
- Riga 2: “Ordine Ingegneri AG n. 1244 · Viale della Vittoria 105, Agrigento · v2 · N progetti attivi” #9E9E9E text-xs
- N progetti attivi: `SELECT COUNT(*) FROM tb_projects WHERE prj_status='active'`

### Alert bar urgenti

- Sfondo `#C62828`, padding `8px 20px`, testo bianco text-sm
- Formato: `🔴 N urgenti → [cod] · [titolo] | [cod] · [titolo]`
- Query: `SELECT rec_code, rec_title FROM tb_records WHERE rec_priority=1 AND rec_status IN ('aperto','in_progress') ORDER BY rec_created_at DESC LIMIT 5`
- Se nessun urgente: nascondi completamente la barra

### Stats bar

- Sfondo `#EEEEEE`, 5 colonne, padding `12px 20px`
- Ogni colonna: numero grande + label piccola uppercase
- URGENTI: `rec_priority=1 AND rec_status IN ('aperto','in_progress')`
- ALTA: `rec_priority=1 AND rec_status NOT IN ('chiuso','archiviato')`
- NORMALE/RIC.: `rec_priority=2 AND rec_status NOT IN ('chiuso','archiviato')`
- SOSPESI: `rec_status='sospeso'`
- TOTALI: `rec_status NOT IN ('chiuso','archiviato')`

### Tabs

- Sfondo bianco, bordo-bottom `1px solid #E0E0E0`
- Tab attiva: `border-b-2 border-blue-600 text-blue-700 font-medium`
- Tab inattiva: `text-gray-500 hover:text-gray-700`
- Testi: “Aperti (N)” | “Completati” | “Ore”

### Filtri

Riga 1 — Categoria e Priorità:

```
CAT    [Tutte] [LP] [RB] [PNRR] [PER] [FAM]
PRIORITÀ  [Tutte] [Urg.] [Alta] [Norm.] [Sosp.]
```

Riga 2 — Progetto e ordinamento:

```
[Tutti i progetti ▼]  ORDINA [▼]  [N task]  [+ Nuovo Task]
```

- Pill inattivo: `border border-gray-200 bg-white text-gray-500 text-xs px-3 py-1 rounded-full`
- Pill CAT attivo: `bg-[ws_color] text-white text-xs px-3 py-1 rounded-full`
- Pill PRIORITÀ attivo: `bg-blue-700 text-white text-xs px-3 py-1 rounded-full`
- Dropdown: `select` nativo, `border border-gray-200 rounded px-2 py-1 text-sm text-gray-700`
- “+ Nuovo Task”: `bg-blue-700 text-white text-sm px-4 py-1.5 rounded font-medium`
  → click aggiunge task in inbox (modal semplice con solo titolo)

### Intestazione sezione workspace

```
[LP] Libera Professione ──────────────────── 10
```

- Badge `[LP]`: `bg-[ws_color] text-white font-mono text-xs px-2 py-0.5 rounded`
- Titolo: `font-semibold text-gray-800`
- Numero: `text-gray-400 text-sm`
- Separatore: `border-b border-gray-200 pb-2 mb-3`

-----

### Struttura card

```
╔══════════════════════════════════════════╗  ← bordo-sinistro 3px ws_color
║ LP-002                                   ║  ← monospace #9E9E9E xs
║                                          ║
║ Preventivo CNI  [Task]                   ║  ← titolo semibold + badge inline
║ Capannone PAM (Polifemo)                 ║  ← progetto#616161 text-xs
║                                          ║
║ [alta]                                   ║  ← badge priorità pill
║                                          ║
║ nota breve (2 righe max)                 ║  ← rec_body #616161 xs
║                                          ║
║ 11/05/2026                      [ ✓ ]   ║  ← data + bottone
╚══════════════════════════════════════════╝
```

Stile card:

- `bg-white border border-gray-200 rounded-lg p-4`
- `shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150`
- `border-l-[3px]` con colore `ws_color`

### Badge tipo (inline dopo il titolo, stesso testo)

|Tipo|Classe Tailwind                                                     |
|----|--------------------------------------------------------------------|
|Task|`bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium`  |
|Memo|`bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded font-medium`  |
|EV  |`bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-medium`|

### Badge priorità (pill sotto il titolo)

|Priorità   |Classe Tailwind                                                                         |
|-----------|----------------------------------------------------------------------------------------|
|alta (1)   |`bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded-full`         |
|normale (2)|`bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full`      |
|bassa (3)  |`bg-gray-100 text-gray-500 border border-gray-200 text-xs px-2 py-0.5 rounded-full`     |
|sospeso    |`bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-0.5 rounded-full`|

### Bottone azione card (bottom-right)

- Dimensioni: `28px × 28px`, `border border-gray-200 bg-gray-50 rounded text-sm`
- Task `✓`: hover `bg-green-50 border-green-300 text-green-700`
- Memo `🗑`: hover `bg-red-50 border-red-300 text-red-600`
- Event: nessun bottone (solo visualizzazione)

-----

## MODIFICA 2 — Modal chiusura task con ore lavorate

Click `[✓]` su Task → modal centrato (overlay `bg-black/50`):

```
╔══════════════════════════════════════════╗
║  ✓ Chiudi Task                       [×] ║
╠══════════════════════════════════════════╣
║                                          ║
║  LP-001-T-003                            ║
║  Chiamare RUP per verifica materiali     ║
║                                          ║
║  Ore lavorate (opzionale)                ║
║  ┌──────────┐                            ║
║  │          │ h  (1.5 = 1 ora 30 min)   ║
║  └──────────┘                            ║
║                                          ║
║      [Annulla]       [Chiudi Task ✓]     ║
╚══════════════════════════════════════════╝
```

- Input: `type="number" step="0.5" min="0" max="999" placeholder="0"`
- Chiudi con ESC o click overlay
- “Chiudi Task”: `bg-blue-700 text-white px-4 py-2 rounded font-medium`
- “Annulla”: `border border-gray-200 bg-white px-4 py-2 rounded`
- Al conferma:
  
  ```sql
  UPDATE tb_records
  SET rec_status = 'chiuso',
      rec_done_at = NOW(),
      rec_hours = <decimale o NULL se input vuoto>
  WHERE rec_id = '<id>'
  ```
- Rimuovi card dallo stato React (no page reload)

-----

## MODIFICA 3 — Eliminazione memo

Click `[🗑]` su Memo → mini modal:

```
╔══════════════════════════╗
║  Eliminare questo memo?  ║
║  Operazione irreversibile ║
║                           ║
║  [Annulla]  [Elimina 🗑] ║
╚══════════════════════════╝
```

- “Elimina”: `bg-red-700 text-white px-4 py-2 rounded`
- Conferma: `DELETE FROM tb_records WHERE rec_id = '<id>'`
- Rimuovi card senza reload

-----

## MODIFICA 4 — Tab “Completati”

Lista dei record con `rec_status = 'chiuso'`, stessa griglia 3 colonne.

Card completato:

- Sfondo `#FAFAFA` (leggermente grigio)
- Badge verde `✓ chiuso`: `bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full`
- Testo “Chiuso il gg/mm/aaaa” in `text-gray-400 text-xs`
- Se `rec_hours` presente: badge `bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full` con “2.5h lavorate”
- Nessun bottone di azione

-----

## MODIFICA 5 — Tab “Ore” (report ore lavorate per progetto)

### Cards riepilogative in cima (3 card)

```
╔──────────────╗  ╔──────────────╗  ╔──────────────╗
║  42.5h       ║  ║  12          ║  ║  4           ║
║  Totale ore  ║  ║  Task chiusi ║  ║  Progetti    ║
╚──────────────╝  ╚──────────────╝  ╚──────────────╝
```

Stile: `bg-white border border-gray-200 rounded-lg p-4 shadow-sm`
Numero: `text-2xl font-bold text-gray-900`
Label: `text-xs text-gray-500 uppercase tracking-wide`

### Tabella raggruppata

```
[LP] Libera Professione ─────────────────── 24.5h
──────────────────────────────────────────────────
  LP-001  Depuratore Naro    3 task  12.0h   [▼]
    LP-001-T-001  Chiamare RUP       2.0h  15/05
    LP-001-T-003  Relazione tecnica  5.0h  17/05
    LP-001-T-007  Sopralluogo        5.0h  18/05

  LP-002  Torregrossa        2 task   8.5h   [▼]

[RB] Rebuilding ─────────────────────────── 18.0h
──────────────────────────────────────────────────
  RB-001  Variante SS640     5 task  18.0h   [▼]
```

Intestazione workspace: bordo-sinistro 4px ws_color, sfondo #F5F5F5, testo bold
Riga progetto: hover #F9FAFB, cursore pointer, click → toggle espansione
Riga task espanso: indent 16px, testo più piccolo, sfondo #FAFAFA

### Query SQL riepilogo

```sql
SELECT
  w.ws_code, w.ws_label, w.ws_color, w.ws_icon, w.ws_sort_order,
  p.prj_id, p.prj_code, p.prj_label,
  COUNT(r.rec_id)::int AS task_count,
  ROUND(SUM(r.rec_hours)::numeric, 1) AS ore_totali
FROM tb_records r
JOIN tb_projects p ON r.rec_prj_id = p.prj_id
JOIN tb_workspaces w ON r.rec_ws_id = w.ws_id
WHERE r.rec_kind = 'T'
  AND r.rec_status = 'chiuso'
  AND r.rec_hours IS NOT NULL
GROUP BY w.ws_code, w.ws_label, w.ws_color, w.ws_icon, w.ws_sort_order,
         p.prj_id, p.prj_code, p.prj_label
ORDER BY w.ws_sort_order, p.prj_code;
```

### Query dettaglio progetto

```sql
SELECT rec_code, rec_title,
       ROUND(rec_hours::numeric, 1) AS rec_hours,
       rec_done_at
FROM tb_records
WHERE rec_prj_id = '<prj_id>'
  AND rec_kind = 'T'
  AND rec_status = 'chiuso'
  AND rec_hours IS NOT NULL
ORDER BY rec_done_at DESC;
```

-----

## Ordine implementazione

1. STEP 0: esegui SQL colori workspace
1. Redesign UI completo (header + alert + stats + tabs + filtri + card + sezioni)
1. Modal chiusura task con ore
1. Eliminazione memo
1. Tab Completati
1. Tab Ore con riepilogo espandibile

## Note importanti

- NON toccare `bot/`, `api/`, `vercel.json`
- `rec_hours` è già nel DB
- Mantieni Supabase Realtime funzionante
- Layout responsive: 1 colonna mobile, 2 tablet, 3 desktop
- Procedi un step alla volta, mostra risultato prima di continuare