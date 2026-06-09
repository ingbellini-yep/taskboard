# TASKBOARD — Istruzioni (puntatore)

⚠️ **Le istruzioni operative complete e aggiornate NON sono in questo file.**
Vivono su Supabase, nella tabella `tb_config`, e sono la fonte di verità unica.

## Cosa devi fare, Claude

**All'inizio di ogni sessione in cui l'utente parla di task, memo, eventi, scadenze,
appuntamenti, o di un progetto/cantiere — PRIMA di agire — leggi le istruzioni aggiornate:**

```sql
SELECT cfg_value FROM tb_config WHERE cfg_key = 'istruzioni';
```

Esegui questa query via connettore/MCP Supabase (progetto `dacekxilrahnbwwjovde`) e
**segui alla lettera** ciò che restituisce. Contiene tutte le regole per:

- registrare task / memo / eventi (con codici e categorie)
- Small Tasks & To Do
- sub-task e aggiornamenti cronologici
- sincronizzazione Google Calendar
- memoria condivisa tra le chat (lettura storico + write-back con conferma)

## Perché funziona così

Questo file è volutamente minimo e **non va più aggiornato**: quando le regole cambiano,
vengono modificate solo su Supabase (`tb_config`) e da quel momento valgono per **tutti i
progetti** che contengono questo puntatore, senza dover ricaricare nulla.

## Connessione

- Supabase project: `dacekxilrahnbwwjovde`
- Tabella istruzioni: `tb_config` (chiave `istruzioni`)
- Web app: https://taskboard-kappa-six.vercel.app
