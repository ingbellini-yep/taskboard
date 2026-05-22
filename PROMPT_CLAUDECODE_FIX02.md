# PROMPT CLAUDE CODE — Taskboard FIX02
# Errore: cannot add postgres_changes callbacks after subscribe()

## Errore

```
Error: cannot add `postgres_changes` callbacks for realtime:tb_records_inbox after `subscribe()`.
```

## Causa

Il codice sta chiamando `.on('postgres_changes', ...)` DOPO aver già chiamato `.subscribe()`.
Supabase Realtime richiede che tutti i listener `.on()` siano registrati PRIMA di `.subscribe()`.

## Pattern sbagliato (da correggere)

```typescript
// ❌ SBAGLIATO
const channel = supabase.channel('tb_records_inbox')
channel.subscribe()
channel.on('postgres_changes', { event: '*', schema: 'public', table: 'tb_records' }, callback)
```

## Pattern corretto

```typescript
// ✅ CORRETTO — tutti i .on() PRIMA di .subscribe()
const channel = supabase
  .channel('tb_records_inbox')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tb_records' },
    callback
  )
  .subscribe()
```

## Fix richiesto

1. Trova tutti i file che usano Supabase Realtime (cerca `supabase.channel`)
2. Verifica che la catena sia sempre: `.channel()` → `.on()` → `.subscribe()`
3. Correggi qualsiasi caso in cui `.on()` viene chiamato dopo `.subscribe()`
4. Controlla in particolare il canale `tb_records_inbox` e tutti gli altri canali
   usati per il real-time della board e dell'inbox

## Verifica finale

Dopo la correzione, apri la console del browser e assicurati che
non compaiano più errori `cannot add postgres_changes callbacks after subscribe()`.
