# PROMPT CLAUDE CODE — Taskboard REV02 (aggiornato con screenshot originale)

## Contesto
Modifica la web app React esistente nel progetto `taskboard`.
Il database Supabase è `dacekxilrahnbwwjovde`.
La colonna `rec_hours NUMERIC(6,2)` è già stata aggiunta a `tb_records`.

---

## MODIFICA 1 — Redesign tema chiaro

Sostituisci il tema scuro attuale con un tema chiaro professionale,
coerente con lo screenshot della vecchia board (sfondo bianco, card bianche, bordi grigi).

### Palette colori

| Elemento | Valore |
|---|---|
| Sfondo pagina | `#F4F6F8` |
| Sfondo card | `#FFFFFF` |
| Bordo card | `#E2E8F0` |
| Bordo card (hover) | `#CBD5E0` |
| Testo primario | `#1A202C` |
| Testo secondario | `#4A5568` |
| Testo terziario | `#718096` |
| Header workspace | `#1E3A5F` (blu navy) con testo bianco |
| Accento primario | `#2B6CB0` |
| Sfondo header/nav | `#FFFFFF` con bordo inferiore `#E2E8F0` |
| Sfondo filtri attivi | `#EBF4FF` |

### Badge tipo record
- Task `T` → `bg-blue-600 text-white`
- Memo `M` → `bg-purple-600 text-white`
- Event `EV` → `bg-orange-500 text-white`

### Badge priorità
- Alta (1) → `bg-red-100 text-red-700 border border-red-200`
- Normale (2) → `bg-yellow-50 text-yellow-700 border border-yellow-200`
- Bassa (3) → `bg-gray-100 text-gray-500 border border-gray-200`

### Card task
- Sfondo bianco, bordo sinistro 3px colorato con `ws_color`
- Ombra leggera: `shadow-sm hover:shadow-md`
- Bordo: `border border-gray-200 hover:border-gray-300`
- Transizione: `transition-all duration-150`

### Tipografia
- Font: `Inter` (aggiungi via Google Fonts se non presente)
- Titolo card: `text-gray-900 font-semibold text-sm`
- Sottotitolo progetto: `text-gray-500 text-xs`
- Codice record: `font-mono text-xs text-gray-400`

### Header/Nav
- Sfondo bianco con bordo inferiore sottile
- Logo: emoji 📋 + "Taskboard" in `text-gray-900 font-bold`
- Tab attiva: `bg-blue-50 text-blue-700 font-medium`
- Tab inattiva: `text-gray-500 hover:text-gray-700`

### Filtri e controlli
- Bottoni filtro workspace: bordo colorato con `ws_color`, sfondo bianco
- Filtro attivo: sfondo `ws_color` con testo bianco
- Barra ricerca: sfondo bianco, bordo `#E2E8F0`, focus border `#2B6CB0`
- Toggle raggruppamento: sfondo `#F7FAFC`, tasto attivo `#FFFFFF` con ombra

### Intestazione sezione gruppo
- `text-xs font-semibold text-gray-500 uppercase tracking-wider`
- Linea separatrice sottile sotto

---

## MODIFICA 2 — Chiusura task con ore lavorate

Quando l'utente clicca `[✓]` su un Task (rec_kind = 'T'), invece di chiudere
immediatamente mostra un **modal** di conferma con:

### Struttura modal
```
┌─────────────────────────────────────────┐
│  ✓ Chiudi Task                      [×] │
├─────────────────────────────────────────┤
│  LP-001-T-003                           │
│  Chiamare RUP per verifica materiali    │
│                                         │
│  Ore lavorate (opzionale)               │
│  [____] h  es. 1.5 = 1 ora e 30 min   │
│                                         │
│  [Annulla]          [Chiudi Task ✓]     │
└─────────────────────────────────────────┘
```

### Comportamento
- Input ore: `type="number"` step="0.5" min="0" max="999" placeholder="0"
- Se l'utente lascia vuoto → salva `rec_hours = NULL`
- Al click "Chiudi Task":
  ```sql
  UPDATE tb_records
  SET rec_status = 'chiuso',
      rec_done_at = NOW(),
      rec_hours = <valore_inserito_o_null>
  WHERE rec_id = '<id>'
  ```
- Chiudi modal e rimuovi card dalla board (aggiorna stato locale)
- Il modal si chiude anche con ESC o click fuori

---

## MODIFICA 3 — Eliminazione memo

Su ogni card di tipo Memo (rec_kind = 'M') aggiungi un bottone `[🗑]`
accanto al bottone di chiusura (o al posto, dato che i memo non hanno "ore").

### Comportamento
- Click `[🗑]` → mini modal di conferma:
  ```
  Eliminare questo memo? Operazione irreversibile.
  [Annulla]  [Elimina]
  ```
- Conferma → `DELETE FROM tb_records WHERE rec_id = '<id>'`
- Chiudi modal e rimuovi card dalla board

---

## MODIFICA 4 — Vista riepilogo ore per progetto

Aggiungi una nuova tab nella nav chiamata **"Ore"** (icona ⏱️).

### Layout vista Ore

```
⏱️ Ore lavorate per progetto
──────────────────────────────────────────

[LP] Libero Professionista        24.5h totali
────────────────────────────────────────────────
  LP-001  Depuratore Naro          12.0h
  LP-002  Torregrossa               8.5h
  LP-003  Mensa Sambuca             4.0h

[RB] Rebuilding Srl               18.0h totali
────────────────────────────────────────────────
  RB-001  Variante SS640           18.0h

──────────────────────────────────────────
TOTALE GENERALE                   42.5h
```

### Query SQL per la vista

```sql
SELECT
  w.ws_code,
  w.ws_label,
  w.ws_color,
  w.ws_icon,
  p.prj_id,
  p.prj_code,
  p.prj_label,
  COUNT(r.rec_id) AS task_count,
  SUM(r.rec_hours) AS ore_totali
FROM tb_records r
JOIN tb_projects p ON r.rec_prj_id = p.prj_id
JOIN tb_workspaces w ON r.rec_ws_id = w.ws_id
WHERE r.rec_kind = 'T'
  AND r.rec_status = 'chiuso'
  AND r.rec_hours IS NOT NULL
GROUP BY w.ws_code, w.ws_label, w.ws_color, w.ws_icon,
         p.prj_id, p.prj_code, p.prj_label
ORDER BY w.ws_sort_order, p.prj_code;
```

### Dettaglio progetto (expandable)

Click su una riga progetto → espandi per vedere i singoli task chiusi:

```
  LP-001  Depuratore Naro          12.0h  [▼]
  ┌──────────────────────────────────────────┐
  │ LP-001-T-001  Chiamare RUP        2.0h  │
  │ LP-001-T-003  Relazione tecnica   5.0h  │
  │ LP-001-T-007  Sopralluogo         5.0h  │
  └──────────────────────────────────────────┘
```

Query dettaglio singolo progetto:
```sql
SELECT rec_code, rec_title, rec_hours, rec_done_at
FROM tb_records
WHERE rec_prj_id = '<prj_id>'
  AND rec_kind = 'T'
  AND rec_status = 'chiuso'
  AND rec_hours IS NOT NULL
ORDER BY rec_done_at DESC;
```

### Card riepilogo in cima alla vista

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  42.5h       │ │  12          │ │  3           │
│  Totale ore  │ │  Task chiusi │ │  Progetti    │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## File da modificare

- `src/components/RecordCard.tsx` (o equivalente) — tema + modal
- `src/hooks/useRecords.ts` (o equivalente) — aggiorna query con rec_hours
- `src/App.tsx` o `src/pages/Board.tsx` — aggiunge tab "Ore"
- `src/pages/OreView.tsx` — nuovo componente vista ore (da creare)
- `index.css` o `tailwind.config.js` — eventuali customizzazioni font

---

## Note importanti

1. Mantieni tutto il codice TypeScript esistente funzionante
2. Non modificare la logica del bot Telegram (cartella `bot/` e `api/`)
3. Testa che la chiusura task funzioni prima di procedere con la vista Ore
4. Il campo `rec_hours` è già presente nel database
5. La web app usa React 18 + Vite + Tailwind CSS

## Procedi per step:
1. Redesign tema chiaro
2. Modal chiusura task con ore
3. Eliminazione memo
4. Vista ore per progetto
