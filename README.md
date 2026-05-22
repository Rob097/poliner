# Poliner

PWA per la gestione di un pollaio domestico. In italiano, mobile-first, design pastello.

## Stack

- **Next.js 16.2.x** (App Router) + **React 19** + **TypeScript 6**
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL, Auth, Storage, Edge Functions, pg_cron)
- **@ducanh2912/next-pwa** (manifest + service worker + custom push handler)
- **Recharts** per i grafici di /statistiche
- **Resend** per email transazionali
- **Open-Meteo** per meteo (no API key)
- **Nominatim** per reverse geocoding

## Setup locale

```bash
nvm use 22                       # Richiede Node >= 22
npm install
node scripts/gen-vapid-keys.mjs  # Solo prima volta — genera VAPID + scrive .env.local
npm run dev
```

App disponibile su <http://localhost:3000>.

## Comandi utili

```bash
npm run dev          # dev server webpack (PWA disabilitata in dev)
npm run build        # build produzione webpack (PWA attiva)
npm run start        # avvia build production
npm run typecheck    # tsc senza emit
npm run lint         # eslint .
```

## Secrets da configurare su Supabase Edge Functions

Dashboard → Project Settings → Edge Functions → Secrets:

```
VAPID_PUBLIC_KEY=<da .env.local>
VAPID_PRIVATE_KEY=<da .env.local>
VAPID_SUBJECT=mailto:tuo@email.com
RESEND_API_KEY=<da resend.com — opzionale>
RESEND_FROM=Poliner <noreply@tuodominio.it>
SUPABASE_SECRET_KEYS=<chiavi opzionali separate da virgola per scheduler o chiamate server-to-server>
```

## Struttura

- `app/` — Route App Router con gruppi `(auth)` e `(app)`
- `components/ui/` — Componenti UI riutilizzabili
- `components/layout/` — TabBar, FAB, AppShell, InstallPrompt
- `components/brand/` — Logo
- `lib/supabase/` — Client browser/server/middleware/admin + types
- `lib/push/` — Logica client-side Web Push
- `lib/data/` — Catalogo razze
- `lib/constants/` — Categorie notifiche, tipi manutenzione
- `lib/utils/` — Helper (date, età, meteo, scorte, scadenze, statistiche, geocoding)
- `lib/actions/` — Server actions condivise
- `supabase/migrations/` — Migration SQL versionate
- `supabase/functions/` — Edge Functions Deno (send-push, send-email, cron-notifications)
- `worker/` — Custom service worker handler push
- `public/icons/` — Icone PWA

## Database

22 tabelle nello schema `public`, tutte con RLS attivo. Vedi `supabase/migrations/`.

Progetto Supabase: `sispxufbdmetaszlhurk` (eu-west-1).

## Schedule cron

`pg_cron` job `poliner-notifications` esegue ogni minuto. I promemoria vengono processati al minuto; le scansioni piu pesanti restano cadenzate internamente al minuto 05 ora Italia e il meteo parte all'orario configurato nelle impostazioni. La function `cron-notifications` gestisce promemoria, meteo, uova in scadenza, manutenzioni, trattamenti, scorte basse, fine produzione e muta lunga con dedup su `notifiche_inviate`.

## Fasi di sviluppo

1. ✅ Setup, schema DB, RLS, storage, auth
2. ✅ Onboarding 5-step, login, registrazione, polish
3. ✅ Galline: lista, scheda, foto, muta, salute, trattamenti
4. ✅ Uova: raccolta, nidi, scadenza, regali, rubrica base
5. ✅ Manutenzione, meteo (Open-Meteo), stagionalità, home dinamica
6. ✅ Spese, scorte cibo, lista della spesa, share nativa
7. ✅ Note + promemoria, dettaglio contatto, statistiche con Recharts
8. ✅ Web Push, Edge Functions, cron notifiche, /impostazioni
9. ✅ Rifinitura: offline support, install prompt, 404, polish iOS

## Test PWA in produzione

```bash
npm run build && npm run start
```

`@ducanh2912/next-pwa` è disabilitata in dev (`disable: !isProd`), quindi il service worker e le push richiedono build production per essere testati.
