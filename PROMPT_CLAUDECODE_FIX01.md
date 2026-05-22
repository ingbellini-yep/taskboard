# PROMPT CLAUDE CODE — Taskboard FIX01

## Problemi da correggere

### Problema 1 — Bottone ✓ non visibile sulle card Task

Le card di tipo Task (rec_kind='T') non mostrano il bottone ✓ di chiusura
nella parte inferiore destra. Le card Memo mostrano correttamente il 🗑.

**Fix richiesto:**
Assicurati che le card Task abbiano SEMPRE il bottone ✓ visibile in basso a destra.
Il bottone deve essere identico graficamente al 🗑 dei Memo ma con icona ✓.

Stile bottone ✓:
```
w-8 h-8 border border-gray-200 bg-gray-50 rounded text-gray-400
hover:bg-green-50 hover:border-green-300 hover:text-green-600
flex items-center justify-center transition-colors text-sm
```

Logica condizionale nella card:
```tsx
{rec.rec_kind === 'T' && (
  <button onClick={() => openCloseModal(rec)} title="Chiudi task">
    ✓
  </button>
)}
{rec.rec_kind === 'M' && (
  <button onClick={() => openDeleteModal(rec)} title="Elimina memo">
    🗑
  </button>
)}
{/* EV: nessun bottone */}
```

---

### Problema 2 — Modal "Chiudi task" da semplificare

Il modal attuale ha campi non richiesti ("DESCRIZIONE ATTIVITÀ", "Nessuna ora
ancora registrata" in verde) che non erano nelle specifiche.

**Modal corretto — struttura esatta:**

```
╔══════════════════════════════════════════╗
║  ✓ Chiudi Task                       [×] ║
╠══════════════════════════════════════════╣
║                                          ║
║  LP-001-T-003                            ║
║  [titolo del task]                       ║
║                                          ║
║  Ore lavorate (opzionale)                ║
║  ┌────────────────────┐                  ║
║  │                    │  h               ║
║  └────────────────────┘                  ║
║  es. 1.5 = 1 ora e 30 minuti            ║
║                                          ║
║        [Annulla]    [✓ Chiudi Task]      ║
╚══════════════════════════════════════════╝
```

**Rimuovi:**
- Il campo "DESCRIZIONE ATTIVITÀ"
- Il testo "Nessuna ora ancora registrata" in verde/teal
- Qualsiasi altro campo non richiesto

**Mantieni:**
- Codice record (font-mono text-sm text-gray-500)
- Titolo task (font-semibold text-gray-900)
- UN SOLO campo ore: `type="number" step="0.5" min="0" max="999" placeholder="0"`
- Testo helper: "es. 1.5 = 1 ora e 30 minuti" in text-xs text-gray-400
- Bottone Annulla + Bottone ✓ Chiudi Task

**Comportamento al salvataggio:**
```sql
UPDATE tb_records
SET rec_status = 'chiuso',
    rec_done_at = NOW(),
    rec_hours = <valore numerico o NULL se input vuoto>
WHERE rec_id = '<id>'
```

Dopo il salvataggio:
- Chiudi il modal
- Rimuovi la card dalla board aggiornando lo stato React (senza reload)

---

### Problema 3 — Verifica logica card (controllo generale)

Dopo le correzioni, verifica che ogni card mostri il bottone corretto:

| rec_kind | Bottone mostrato |
|---|---|
| T (Task) | ✓ verde al hover |
| M (Memo) | 🗑 rosso al hover |
| EV (Event) | nessun bottone |

---

## Come procedere

1. Trova il componente card (probabilmente `RecordCard.tsx` o simile)
2. Correggi la logica condizionale del bottone
3. Trova il componente modal di chiusura
4. Semplifica il modal rimuovendo i campi extra
5. Testa che il flusso completo funzioni: click ✓ → modal → inserisci ore → Chiudi → card sparisce dalla board
6. Fai commit e push
