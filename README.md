# Poliner

PWA per la gestione di un pollaio domestico. In italiano, mobile-first, design pastello.

## Stack

- **Next.js 14.2.x** (App Router) + **TypeScript**
- **Tailwind CSS v3**
- **Supabase** (PostgreSQL, Auth, Storage, Edge Functions, pg_cron)
- **next-pwa** (manifest + service worker + custom push handler)
- **Recharts** per i grafici di /statistiche
- **Resend** per email transazionali
- **Open-Meteo** per meteo (no API key)
- **Nominatim** per reverse geocoding

## Setup locale

```bash
nvm use 22                       # Richiede Node >= 18.17
npm install
node scripts/gen-vapid-keys.mjs  # Solo prima volta — genera VAPID + scrive .env.local
npm run dev
```

App disponibile su <http://localhost:3000>.

## Comandi utili

```bash
npm run dev          # dev server (PWA disabilitata in dev)
npm run build        # build produzione (PWA attiva)
npm run start        # avvia build production
npm run typecheck    # tsc senza emit
npm run lint         # next lint
```

## Secrets da configurare su Supabase Edge Functions

Dashboard → Project Settings → Edge Functions → Secrets:

```
VAPID_PUBLIC_KEY=<da .env.local>
VAPID_PRIVATE_KEY=<da .env.local>
VAPID_SUBJECT=mailto:tuo@email.com
RESEND_API_KEY=<da resend.com — opzionale>
RESEND_FROM=Poliner <noreply@tuodominio.it>
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

`pg_cron` job `poliner-notifications` esegue ogni ora al minuto 5, chiama l'edge function `cron-notifications` che scansiona promemoria, uova in scadenza, manutenzioni, trattamenti, scorte basse e invia push + email con dedup (`notifiche_inviate`).

## Fasi di sviluppo

1. ✅ Setup, schema DB, RLS, storage, auth
2. ✅ Onboarding 5-step, login, registrazione, polish
3. ✅ Galline: lista, scheda, foto, muta, salute, trattamenti
4. ✅ Uova: raccolta, nidi, scadenza, regali, rubrica base
5. ✅ Manutenzione, meteo (Open-Meteo), stagionalità, home dinamica
6. ✅ Spese, scorte cibo, lista della spesa, share nativa
7. ✅ Note + promemoria, dettaglio contatto, statistiche con Recharts
8. ✅ Web Push, Edge Functions, cron giornaliera, /impostazioni
9. ✅ Rifinitura: offline support, install prompt, 404, polish iOS

## Test PWA in produzione

```bash
npm run build && npm run start
```

next-pwa è disabilitata in dev (`disable: !isProd`), quindi il service worker e le push richiedono build production per essere testati.
