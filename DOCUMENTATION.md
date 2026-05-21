# Poliner — Documentation

## 1. Overview
- Poliner is an Italian, mobile-first PWA for managing a domestic chicken coop. It combines daily records for chickens, eggs, maintenance, weather, openings/closings, contacts, notes, and notifications in one shared app instead of notebooks, chat messages, and spreadsheets.
- The app is meant for coop owners and invited collaborators. The codebase supports one or more members per coop through the `pollaio_members` table; the exact live user count is `⚠️ needs verification` because there is no production analytics data in the repository.
- Users reach the app through private authenticated routes under `/(app)`, public auth routes under `/(auth)`, invite links at `/invito/[token]`, and public read-only coop pages at `/p/[slug]`. The app can be installed as a PWA through `app/manifest.ts` and the service worker configured in `next.config.mjs`; the production URL is `⚠️ needs verification`, while local development runs at `http://localhost:3000`.

## 2. Features
### Authentication & onboarding
- What it does: lets people register, log in, reset a password, complete a first-time setup flow, and accept coop invites.
- Who can use it: anonymous visitors, newly registered users, and invited users.
- Key interactions / user flow: `app/(auth)/login/page.tsx` signs in with `supabase.auth.signInWithPassword()`, `app/(auth)/registrazione/page.tsx` signs up with `supabase.auth.signUp()`, `app/(auth)/reset-password/page.tsx` sends reset emails, `app/auth/callback/route.ts` exchanges the auth code for a session, and `app/onboarding/page.tsx` starts `OnboardingFlow.tsx` unless the user already belongs to a coop or has a pending invite.

### Invite acceptance
- What it does: creates email invites, shows the invite landing page, creates an invited account when needed, and attaches the user to the right coop.
- Who can use it: admins create invites; invited people can open and accept them.
- Key interactions / user flow: admins use `lib/actions/inviti.ts` (`creaInviti`, `revocaInvito`), invitees open `app/invito/[token]/page.tsx`, public invite data comes from `getInvitoPublic()`, invite-specific account creation uses `creaAccountDaInvito()`, and final membership is granted through the `accept_invito` RPC wrapped by `accettaInvito()`.

### Home dashboard
- What it does: shows the active coop summary, unread notifications count, weather, opening/closing status, egg and flock counters, and alert cards for overdue work or urgent situations.
- Who can use it: authenticated coop members.
- Key interactions / user flow: `app/(app)/page.tsx` calls `requirePollaio()` and `loadHomeData()` from `lib/queries/home.ts`, then assembles alert cards for maintenance, health issues, expiring eggs, low stock, reminders, and home-hospital cases.

### Chicken management
- What it does: lists chickens, opens a detailed profile page, adds or edits animals, records molt and health events, and keeps a memorial list for deceased animals.
- Who can use it: authenticated members can read; write access is intended to be admin-led in the UI, but exact guest write enforcement is `⚠️ needs verification`.
- Key interactions / user flow: `app/(app)/galline/page.tsx` builds the overview list, `app/(app)/galline/[id]/page.tsx` renders `ChickenDetail.tsx`, `app/(app)/galline/nuova/page.tsx` and `app/(app)/galline/[id]/modifica/page.tsx` load the create/edit forms, `app/(app)/galline/in-memoria/page.tsx` shows deceased animals, and mutations are implemented in `app/(app)/galline/actions.ts` through functions such as `createAnimale()`, `updateAnimale()`, `segnaAnimaleDefunto()`, `avviaMuta()`, `terminaMuta()`, `aggiungiEventoSalute()`, and insertion-timeline helpers.

### Eggs, nests, and gifting
- What it does: records single eggs, records batch egg collection, manages nests, marks eggs as consumed, restores them, and records gifts to contacts.
- Who can use it: authenticated members can read; the UI treats egg inventory management as an admin flow.
- Key interactions / user flow: `app/(app)/uova/page.tsx` shows inventory and history, `app/(app)/uova/nuovo/page.tsx` and `app/(app)/uova/batch/page.tsx` load collection forms, `app/(app)/uova/nidi/page.tsx` manages nests, `app/(app)/uova/regala/page.tsx` records gifts, and `app/(app)/uova/actions.ts` implements `createNido()`, `createUovo()`, `createUovaBulk()`, `consumaUovo()`, `ripristinaUovo()`, `aggiornaConservazione()`, and `regalaUova()`.

### Egg requests
- What it does: lets a coop member request eggs from the available stock and lets an admin accept or reject that request.
- Who can use it: all members can create their own request; admins handle acceptance or rejection.
- Key interactions / user flow: `components/uova/RichiesteSection.tsx` is rendered inside `app/(app)/uova/page.tsx`, creation happens through `lib/actions/richieste.ts::creaRichiestaUova()`, and acceptance/rejection use the `accetta_richiesta_uova` and `rifiuta_richiesta_uova` RPCs through `accettaRichiesta()` and `rifiutaRichiesta()`.

### Maintenance
- What it does: manages recurring maintenance tasks, shows due and overdue items, logs completed work, and exposes a catalog of suggested tasks.
- Who can use it: all members can view; the UI exposes edits and configuration to admins.
- Key interactions / user flow: `app/(app)/manutenzione/page.tsx` loads active `manutenzioni_voci` plus recent `manutenzioni` logs, calculates status with `calcolaStatiManutenzione()`, and hands the result to `ManutenzioneClient.tsx` for logging and editing.

### Weather
- What it does: shows current weather, three-day forecasts, weather alerts, and a short coop-specific recommendation.
- Who can use it: authenticated members for their active coop.
- Key interactions / user flow: `app/(app)/meteo/page.tsx` requires a saved coop location, calls `fetchMeteo()` from `lib/utils/meteo.ts`, saves a daily snapshot through `salvaMeteoStorico()`, and links out to 3B Meteo for a longer forecast.

### Notes & reminders
- What it does: stores free-form notes, photo notes, tags, and scheduled reminders that can later become push or email notifications.
- Who can use it: authenticated members can read; write availability for guests is `⚠️ needs verification` because the UI and RLS are not fully centralized.
- Key interactions / user flow: `app/(app)/note/page.tsx` loads active notes, `NoteClient.tsx` handles the editor, and `app/(app)/note/actions.ts` provides `createNota()`, `updateNota()`, `deleteNota()`, and `archiviaNota()`.

### Contacts & gift history
- What it does: stores the coop address book, shows contact details, tracks how many eggs each person received, and lets admins link a contact to a guest member.
- Who can use it: authenticated members can browse; member/contact linking is an admin-side flow.
- Key interactions / user flow: `app/(app)/rubrica/page.tsx` shows the contact list with aggregate gift counts, `app/(app)/rubrica/[id]/page.tsx` shows the per-contact history and actions, and `merge_contatto_con_utente()` in `0014_contatti_utente.sql` powers contact-to-user merging.

### Expenses
- What it does: tracks coop spending and feeds the cost summaries used by the statistics screen.
- Who can use it: authenticated members can view; writes are intended for admins.
- Key interactions / user flow: `app/(app)/spese/page.tsx` loads all expenses plus egg production dates, and `SpeseClient.tsx` handles create/edit/delete with route-local actions in `app/(app)/spese/actions.ts`.

### Feed inventory
- What it does: tracks feed stock, quantities, refill history, and low-stock thresholds used on the home dashboard and in notifications.
- Who can use it: authenticated members can view; writes are intended for admins.
- Key interactions / user flow: `app/(app)/scorte/page.tsx` loads `scorte_cibo`, `ScorteClient.tsx` manages the list, and `app/(app)/scorte/actions.ts` provides `createScorta()`, `updateScorta()`, `deleteScorta()`, `rifornisciScorta()`, and `consumaScorta()`.

### Shopping list
- What it does: keeps a shared shopping list for feed, litter, medicines, and other coop supplies.
- Who can use it: authenticated members can read; writes are intended for admins.
- Key interactions / user flow: `app/(app)/lista-spesa/page.tsx` loads list items for the active coop and passes them to `ListaSpesaClient.tsx`, which uses route-local actions in `app/(app)/lista-spesa/actions.ts`.

### Openings & closings
- What it does: records daily coop opening and closing times and keeps a short history.
- Who can use it: all members can see the history; the UI exposes editing and registration to admins.
- Key interactions / user flow: `app/(app)/uscite/page.tsx` loads the last 60 log rows, `UsciteClient.tsx` renders the timeline, and `lib/actions/uscite.ts` implements `registraApertura()`, `registraChiusura()`, `aggiornaOrario()`, `creaUscitaManuale()`, and `eliminaUscita()`.

### Notifications center
- What it does: shows the history of sent notifications, marks them as read, and groups them by day.
- Who can use it: authenticated users see only their own notification history.
- Key interactions / user flow: `app/(app)/notifiche/page.tsx` reads from `notifiche_inviate`, maps categories to destination links such as `/note`, `/uova`, or `/galline`, and uses route actions to mark one or all notifications as read.

### Statistics
- What it does: visualizes egg production, egg destination, per-hen output, spending, spending by category, and a weather-versus-production overlay.
- Who can use it: authenticated members.
- Key interactions / user flow: `app/(app)/statistiche/page.tsx` loads data from `uova`, `animali`, `spese`, `meteo_storico`, and `periodi_muta`; `StatisticheClient.tsx` uses Recharts to render bar, pie, and composed charts across several time windows.

### Settings & member management
- What it does: manages the user display name, coop name and location, egg storage settings, notification preferences, push enablement, test push delivery, member list, invite workflow, and the public coop page.
- Who can use it: all members can open settings and edit their own notification preferences; admins can change coop-level settings, manage members, manage invites, and enable the public page.
- Key interactions / user flow: `app/(app)/impostazioni/page.tsx` loads settings data, `ImpostazioniClient.tsx` calls `aggiornaProfilo()`, `aggiornaPreferenzeNotifiche()`, `aggiornaPollaio()`, `attivaPaginaPubblica()`, `disattivaPaginaPubblica()`, and `aggiornaDescrizionePubblica()`, `app/(app)/impostazioni/membri/page.tsx` loads members and pending invites, and `MembriClient.tsx` exposes role changes and removal flows through `lib/actions/pollaio.ts` and `lib/actions/inviti.ts`.

### Public coop page
- What it does: publishes a read-only public page with coop information, public text, living animals, and simple stats.
- Who can use it: anyone with the slug URL; admins enable or disable it from settings.
- Key interactions / user flow: `app/(public)/p/[slug]/page.tsx` uses `createPublicClient()`, reads only public fields from `pollai` and `animali`, calls `public_pollaio_stats()`, renders `PaginaPubblicaView.tsx`, and is regenerated with `revalidate = 300`.

### PWA & offline support
- What it does: lets the app install on a device, cache key assets, show an offline page, and handle web push notifications.
- Who can use it: any browser that supports service workers and push; push needs permission plus a VAPID public key.
- Key interactions / user flow: `app/manifest.ts` defines the installable metadata, `next.config.mjs` wires `next-pwa`, `app/offline/page.tsx` is the fallback document, `lib/push/client.ts` manages subscription setup and worker migration logic, and push delivery comes from `lib/push/server.ts` plus Supabase Edge Functions.

## 3. User roles & permissions
| Role | Description | What they can do | What they cannot do |
| --- | --- | --- | --- |
| Anonymous visitor | Not logged in. | Open `/login`, `/registrazione`, `/reset-password`, `/invito/[token]`, and public pages under `/p/[slug]`. | Cannot enter `/(app)` routes or query private coop data. |
| Authenticated user without coop membership | Logged in, but not yet linked to a coop. | Complete `app/onboarding/page.tsx`, accept an invite, or wait for an admin to invite them. | Cannot use the private coop screens until `requirePollaio()` finds a membership. |
| Guest | Invited member. In the UI this role is described as `Guest · solo visualizzazione` in `app/(app)/impostazioni/membri/MembriClient.tsx`. | View the private app for that coop, switch active coops, receive notifications, and create their own egg requests. | Cannot manage members, invites, public page settings, or guaranteed admin-only settings flows. Exact write access on some feature actions is `⚠️ needs verification` because enforcement is not fully centralized. |
| Admin | Coop owner or collaborating admin. | Use the full app, manage members and invites, update coop settings, enable the public page, handle maintenance and operational logs, and approve egg requests. | Cannot remove or demote the last admin, and cannot manage coops they do not belong to. |

## 4. Tech stack
| Layer | Technology | Purpose | Notes |
| --- | --- | --- | --- |
| UI framework | Next.js 14.2 App Router | Pages, layouts, server components, server actions | Main routes live under `app/` |
| Language | TypeScript 5.6 | Type safety across app and Supabase calls | DB types are generated into `lib/supabase/database.types.ts` |
| Styling | Tailwind CSS 3.4 | Layout and visual styling | Global theme is defined in `app/globals.css` |
| Charts | Recharts 3.8 | Statistics visualizations | Used in `app/(app)/statistiche/StatisticheClient.tsx` |
| Auth/session | `@supabase/ssr` + `@supabase/supabase-js` | Cookie-backed auth and typed DB access | Clients are split across `lib/supabase/*.ts` |
| Database | Supabase Postgres | Primary relational data store | Multi-tenant design with RLS on all public app tables |
| Storage | Supabase Storage | Image storage for coop, chicken, egg, note, and maintenance media | Bucket is `poliner-media` and is public |
| Edge Functions | Supabase Edge Functions (Deno) | Push sending, email sending, scheduled notification scans | `supabase/functions/send-push`, `send-email`, `cron-notifications` |
| Scheduler | `pg_cron` + `pg_net` | Calls `cron-notifications` every minute | See `0005_pg_cron.sql` and `scripts/setup-pg-cron.sql` |
| PWA layer | `next-pwa` + service workers | Install prompt, caching, offline fallback, push integration | Configured in `next.config.mjs`, custom worker code in `worker/index.js` |
| Deployment | `@opennextjs/cloudflare` + Wrangler | Packages and deploys Next.js to Cloudflare Workers | `npm run deploy` wraps the OpenNext build/deploy commands |
| Email provider | Resend | Transactional email delivery | Called from `supabase/functions/send-email/index.ts` and `cron-notifications` |
| Weather & geocoding | Open-Meteo, Open-Meteo Geocoding, Nominatim | Forecasts, autocomplete place search, reverse geocoding | `lib/utils/meteo.ts` and `lib/utils/geocoding.ts` |

## 5. Architecture overview
- The frontend is a Next.js App Router application deployed to Cloudflare Workers through OpenNext. Private screens live in `app/(app)`, auth screens in `app/(auth)`, and anonymous public pages in `app/(public)`. The shared app shell comes from `app/(app)/layout.tsx` and `components/layout/AppShell.tsx`.
- Supabase provides authentication, the main Postgres database, storage, and serverless Edge Functions. The app uses purpose-specific clients from `lib/supabase/`: browser, server, admin, public, middleware, and route guards.
- Cloudflare runs the built Next.js worker defined by `wrangler.jsonc`. Supabase Edge Functions handle background or privileged work that should not run in the browser, especially `send-email`, `send-push`, and the scheduled `cron-notifications` function.
- The app is also a PWA. `app/manifest.ts`, `next.config.mjs`, `worker/index.js`, `public/push-sw.js`, and `lib/push/client.ts` together manage installation, caching, offline fallback, and push notifications.

### Data flow: from user action to DB and back
1. A user interacts with a client component such as `NuovoUovoForm.tsx`, `NoteClient.tsx`, or `ImpostazioniClient.tsx`.
2. The component calls a server action or an API route, for example `app/(app)/uova/actions.ts`, `lib/actions/richieste.ts`, or `app/api/push/subscribe/route.ts`.
3. The action resolves the current session through `requireUser()` or `requirePollaio()` from `lib/supabase/queries.ts`.
4. The action writes directly to Supabase tables or calls an RPC such as `accept_invito`, `accetta_richiesta_uova`, or `public_pollaio_stats`.
5. The action runs `revalidatePath()` so the next server render reads the new state.
6. If the action should notify people, the app either calls `sendPushToUser()` in `lib/push/server.ts` or relies on the `cron-notifications` Edge Function and then logs the result into `notifiche_inviate`.

### Authentication flow
1. Normal sign-in and sign-up use Supabase Auth from the browser through `lib/supabase/client.ts`.
2. Auth callbacks and password reset redirects come back through `app/auth/callback/route.ts`, which uses `getSafeInternalRedirect()` from `lib/utils/internal-redirect.ts` to avoid open redirects.
3. `middleware.ts` calls `lib/supabase/middleware.ts::updateSession()` on every request. It refreshes session cookies and redirects unauthenticated users away from private routes.
4. Server components that need a logged-in user call `requireUser()`. Screens that need an active coop call `requirePollaio()`.
5. `requirePollaio()` loads memberships from `pollaio_members`, resolves `profiles.pollaio_attivo_id`, and redirects users without a coop to `/onboarding`.
6. Invite acceptance is special: public invite metadata is read with the admin client, invited account creation can happen server-side with `auth.admin.createUser({ email_confirm: true })`, and membership is granted through the `accept_invito` RPC.

## 6. Project structure
- Source-focused tree (build outputs such as `.next/` and `.open-next/` omitted):

```text
app/        Next.js App Router routes, layouts, metadata, API routes, and route-local actions
components/ Shared UI, layout shell, brand components, and feature components
docs/       Planning notes, handoff material, and supporting project docs
lib/        Shared business logic: Supabase helpers, server actions, queries, hooks, constants, utils, types, static data
public/     Static assets, icons, generated service-worker files, and headers
scripts/    Helper scripts for local setup and Supabase scheduler alignment
supabase/   SQL migrations and Supabase Edge Functions
worker/     Custom service-worker code merged into the generated PWA worker
```

- Key files and what they do:
  - `middleware.ts`: global request middleware entry point; delegates session refresh to `lib/supabase/middleware.ts`.
  - `next.config.mjs`: configures `next-pwa`, runtime caching, security headers, image domains, and optional OpenNext dev initialization.
  - `open-next.config.ts`: OpenNext Cloudflare adapter entry point.
  - `wrangler.jsonc`: Cloudflare Worker deployment configuration for the built OpenNext output.
  - `app/layout.tsx`: root HTML layout plus app-level metadata and viewport settings.
  - `app/manifest.ts`: PWA manifest.
  - `app/(app)/page.tsx`: home dashboard.
  - `lib/supabase/queries.ts`: main server-side auth and active-coop guards.
  - `lib/queries/home.ts`: centralized loader for the home dashboard data.
  - `lib/push/client.ts`: browser push subscription logic and worker migration logic.
  - `lib/push/server.ts`: server-side push dispatch helper.
  - `scripts/gen-vapid-keys.mjs`: generates VAPID keys and updates `.env.local` when present.
  - `scripts/setup-pg-cron.sql`: SQL template for the `poliner-notifications` scheduler job.
  - `REFACTORING_SUMMARY.md`: summary of the refactor phases and intentionally deferred work.
  - `SECURITY_REPORT.md`: summary of fixed security issues and remaining manual follow-ups.

## 7. Database schema
- Final application tables are reflected in `lib/supabase/database.types.ts`.
- The main helper functions that shape access are `is_my_pollaio(uuid)` and `my_pollaio_role(uuid)`.
- Important RPCs are `accept_invito`, `accetta_richiesta_uova`, `rifiuta_richiesta_uova`, `merge_contatto_con_utente`, `animale_in_inserimento`, and the intentionally public `public_pollaio_stats`.

### profiles
- Purpose: app-facing profile row created automatically when a new Supabase Auth user is created.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Supabase Auth user id | PK, FK -> `auth.users.id` |
| `display_name` | `text` | Name shown in the UI | nullable |
| `avatar_url` | `text` | Reserved avatar URL field | nullable |
| `email` | `text` | Copied user email | nullable |
| `pollaio_attivo_id` | `uuid` | Currently selected coop | nullable, FK -> `pollai.id` |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: own-row select and update only (`profiles_select_own`, `profiles_update_own`). Inserts come from `public.handle_new_user()`.
- Relationships to other tables: optional link to `pollai` through `pollaio_attivo_id`.

### preferenze_notifiche
- Purpose: per-user notification settings.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `user_id` | `uuid` | User id that owns the preferences | PK, FK -> `auth.users.id` |
| `globale_attivo` | `boolean` | Master on/off switch | default `true` |
| `push_attivo` | `boolean` | Push notifications enabled | default `true` |
| `email_attivo` | `boolean` | Email notifications enabled | default `true` |
| `ora_notifiche_meteo` | `time` | Preferred weather notification time | default `20:00` |
| `non_disturbare_inizio` | `time` | Quiet-hours start | nullable |
| `non_disturbare_fine` | `time` | Quiet-hours end | nullable |
| `categorie` | `jsonb` | Per-category notification toggles | default `{}` |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: own-row select, insert, and update only.
- Relationships to other tables: owned by the user in `auth.users`.

### push_subscriptions
- Purpose: stores browser push subscriptions for a user.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Subscription row id | PK |
| `user_id` | `uuid` | Owner of the subscription | FK -> `auth.users.id` |
| `endpoint` | `text` | Push service endpoint URL | unique, required |
| `p256dh` | `text` | Push public key | required |
| `auth` | `text` | Push auth secret | required |
| `user_agent` | `text` | Browser/device hint | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: own-row select, insert, and delete only.
- Relationships to other tables: owned by the user in `auth.users`.

### pollai
- Purpose: main coop record.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Coop id | PK |
| `user_id` | `uuid` | Original creator/owner account | FK -> `auth.users.id` |
| `nome` | `text` | Coop name | required |
| `posizione_lat` | `numeric` | Latitude | nullable |
| `posizione_lng` | `numeric` | Longitude | nullable |
| `posizione_nome` | `text` | Human-readable place name | nullable |
| `foto_url` | `text` | Coop image URL | nullable |
| `conservazione_ambiente_giorni` | `int` | Default shelf life for room-temperature eggs | default `20` |
| `conservazione_frigo_giorni` | `int` | Default shelf life for refrigerated eggs | default `28` |
| `pubblico_attivo` | `boolean` | Whether `/p/[slug]` is public | default `false` |
| `pubblico_slug` | `text` | Public page slug | unique, nullable, regex check `[a-z0-9-]{3,40}` |
| `descrizione_pubblica` | `text` | Public page description | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: authenticated members can select their coop; admins can update and delete; any authenticated user can insert their own new coop; `pollai_select_public` exposes rows with `pubblico_attivo = true` to `anon` and `authenticated` for the public page.
- Relationships to other tables: parent table for almost every coop-scoped table (`animali`, `uova`, `contatti`, `spese`, `note`, `manutenzioni_*`, `meteo_storico`, `richieste_uova`, and more).

### pollaio_members
- Purpose: membership and role mapping between users and coops.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `pollaio_id` | `uuid` | Coop id | PK part, FK -> `pollai.id` |
| `user_id` | `uuid` | Member user id | PK part, FK -> `auth.users.id` |
| `ruolo` | `text` | Membership role | check `admin` or `guest` |
| `created_at` | `timestamptz` | Membership creation time | default `now()` |

- RLS policies in effect: members of the same coop can select rows; admins can update; admins or the user themself can delete; there is no direct insert policy because membership inserts are handled by triggers and RPCs.
- Relationships to other tables: joins users to `pollai`; `profiles.pollaio_attivo_id` resolves against this table in `requirePollaio()`.

### pollaio_inviti
- Purpose: pending and accepted invite records.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Invite row id | PK |
| `pollaio_id` | `uuid` | Target coop | FK -> `pollai.id` |
| `email` | `text` | Invitee email | required |
| `ruolo` | `text` | Role to assign on accept | check `admin` or `guest` |
| `token` | `uuid` | Invite token used in the URL | unique |
| `invitato_da` | `uuid` | User who created the invite | FK -> `auth.users.id` |
| `messaggio` | `text` | Optional invite note | nullable |
| `scadenza` | `timestamptz` | Expiry time | default `now() + 7 days` |
| `accettato_il` | `timestamptz` | Acceptance time | nullable |
| `accettato_da` | `uuid` | User who accepted | nullable, FK -> `auth.users.id` |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: admins have full CRUD on their coop invites; invitees can select their own still-valid invite if `lower(email) = lower(auth.jwt() ->> 'email')`.
- Relationships to other tables: belongs to `pollai`; references inviter and accepter in `auth.users`.

### animali
- Purpose: chicken and rooster records.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Animal id | PK |
| `pollaio_id` | `uuid` | Coop owner id | FK -> `pollai.id` |
| `nome` | `text` | Animal name | required |
| `tipo` | `text` | Animal type | check `gallina` or `gallo` |
| `razza_id` | `text` | Breed id from static catalog | nullable |
| `razza_custom` | `text` | Free-text breed override | nullable |
| `data_nascita` | `date` | Birth date | nullable |
| `eta_approssimativa_mesi` | `int` | Approximate age in months when birth date is unknown | nullable |
| `colore_piumaggio` | `text` | Plumage color | nullable |
| `foto_url` | `text` | Photo URL | nullable |
| `note` | `text` | Private notes | nullable |
| `attivo` | `boolean` | Active in the flock | default `true` |
| `defunta_il` | `date` | Date of death | nullable |
| `causa_decesso` | `text` | Cause of death | nullable |
| `note_decesso` | `text` | Additional death notes | nullable |
| `descrizione_pubblica` | `text` | Text shown on the public page | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: `animali_select`, `animali_insert`, `animali_update`, and `animali_delete` currently allow any authenticated member of the coop through `is_my_pollaio(pollaio_id)`; `animali_select_public` exposes active, non-deceased animals when the parent coop is public.
- Relationships to other tables: belongs to `pollai`; referenced by `uova`, `eventi_salute`, `periodi_muta`, `trattamenti`, and `eventi_inserimento`.

### eventi_inserimento
- Purpose: timeline of introducing a new animal into the flock.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Timeline event id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `animale_id` | `uuid` | Animal involved | FK -> `animali.id` |
| `tipo` | `tipo_evento_inserimento` | Step type | enum |
| `data` | `date` | Event date | default `current_date` |
| `note` | `text` | Optional note | nullable |
| `foto_url` | `text` | Optional image | nullable |
| `created_by` | `uuid` | User who logged the event | nullable, FK -> `auth.users.id` |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: authenticated members of the coop can select, insert, update, and delete these rows.
- Relationships to other tables: belongs to `pollai` and `animali`.

### eventi_salute
- Purpose: health incidents and home-hospital tracking.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Health event id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `animale_id` | `uuid` | Animal affected | FK -> `animali.id` |
| `data` | `timestamptz` | Event date/time | default `now()` |
| `tipo` | `text` | Event category | check `ferita`, `malattia`, `comportamento`, `parassiti`, `guscio`, `altro` |
| `descrizione` | `text` | Free-text details | nullable |
| `foto_url` | `text` | Optional photo | nullable |
| `stato` | `text` | Whether the issue is open or resolved | check `in_corso` or `risolto` |
| `data_risoluzione` | `timestamptz` | Resolution time | nullable |
| `note_followup` | `text` | Follow-up notes | nullable |
| `home_hospital` | `boolean` | Whether the animal was taken home for care | default `false` |
| `hh_da` | `date` | Home-hospital start date | nullable |
| `hh_a` | `date` | Home-hospital end date | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: members can read; writes are admin-scoped through `my_pollaio_role(pollaio_id) = 'admin'`.
- Relationships to other tables: belongs to `pollai` and `animali`.

### periodi_muta
- Purpose: molt periods for each animal.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Molt period id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `animale_id` | `uuid` | Animal id | FK -> `animali.id` |
| `data_inizio` | `date` | Start date | required |
| `data_fine` | `date` | End date | nullable |
| `note` | `text` | Optional notes | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai` and `animali`.

### trattamenti
- Purpose: treatments, medication, or flock-wide care events.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Treatment id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `animale_id` | `uuid` | Specific animal, if not flock-wide | nullable, FK -> `animali.id` |
| `applica_a_tutti` | `boolean` | Applies to all animals | default `false` |
| `data` | `timestamptz` | Treatment date/time | default `now()` |
| `tipo` | `text` | Treatment type | required |
| `prodotto` | `text` | Product name | nullable |
| `dose` | `text` | Dosage | nullable |
| `note` | `text` | Optional notes | nullable |
| `prossima_data` | `timestamptz` | Next planned treatment date | nullable |
| `notifica_inviata` | `boolean` | Whether a reminder has already been sent | default `false` |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai` and optionally `animali`.

### nidi
- Purpose: nest definitions used when recording eggs.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Nest id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `nome` | `text` | Nest name | required |
| `note` | `text` | Optional notes | nullable |
| `ordine` | `int` | Sort order | default `0` |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`; referenced by `uova`.

### uova
- Purpose: individual egg records.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Egg id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `animale_id` | `uuid` | Chicken that laid the egg | nullable, FK -> `animali.id` |
| `nido_id` | `uuid` | Nest where it was laid | nullable, FK -> `nidi.id` |
| `data_deposizione` | `timestamptz` | Lay date/time | default `now()` |
| `foto_url` | `text` | Optional photo | nullable |
| `note` | `text` | Optional notes | nullable |
| `stato` | `text` | Inventory state | check `disponibile`, `consumato`, `regalato` |
| `conservazione` | `text` | Storage mode | check `ambiente` or `frigo` |
| `regalo_id` | `uuid` | Gift record if the egg was gifted | nullable, FK -> `regali.id` |
| `data_consumato` | `timestamptz` | Consumption date/time | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`; optionally points to `animali`, `nidi`, and `regali`.

### regali
- Purpose: gift transactions that group eggs given to a contact.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Gift id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `contatto_id` | `uuid` | Contact who received the eggs | nullable, FK -> `contatti.id` |
| `quantita` | `int` | Number of eggs | check `> 0` |
| `data` | `timestamptz` | Gift date/time | default `now()` |
| `note` | `text` | Optional notes | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`; optionally points to `contatti`; referenced by `uova` and `richieste_uova`.

### contatti
- Purpose: address book entries used for gifts and guest linking.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Contact id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `nome` | `text` | Contact name | required |
| `relazione` | `text` | Relationship label | nullable |
| `telefono` | `text` | Phone number | nullable |
| `note` | `text` | Optional notes | nullable |
| `utente_id` | `uuid` | Linked coop member account | nullable, unique per coop, FK -> `auth.users.id` |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`; can link to an auth user; referenced by `regali`.

### richieste_uova
- Purpose: guest/member egg requests.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Request id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `richiedente_user_id` | `uuid` | User who asked for eggs | FK -> `auth.users.id` |
| `quantita` | `int` | Requested quantity | check `> 0` |
| `nota` | `text` | Optional note | nullable |
| `stato` | `text` | Request state | check `in_attesa`, `accettata`, `rifiutata` |
| `evasa_da` | `uuid` | User who handled the request | nullable, FK -> `auth.users.id` |
| `evasa_il` | `timestamptz` | Handling time | nullable |
| `regalo_id` | `uuid` | Gift record created on acceptance | nullable, FK -> `regali.id` |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: all members can select; a member can insert only for themself; only admins can update; admins or the requester can delete while the request is still pending.
- Relationships to other tables: belongs to `pollai`; optionally points to `regali`; references requester and fulfiller users.

### manutenzioni_voci
- Purpose: active recurring maintenance task definitions.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Maintenance item id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `nome` | `text` | Task name | required |
| `dove` | `text` | Where the task applies | nullable |
| `icona` | `text` | Emoji/icon used in the UI | default `🧹` |
| `frequenza_giorni` | `int` | Expected interval in days | check `> 0` |
| `note` | `text` | Optional notes | nullable |
| `consiglio_id` | `text` | Static catalog origin id | nullable |
| `attivo` | `boolean` | Whether the task is active | default `true` |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`; referenced by `manutenzioni`.

### manutenzioni
- Purpose: maintenance log entries.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Log id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `voce_id` | `uuid` | Maintenance item being completed | FK -> `manutenzioni_voci.id` |
| `data` | `timestamptz` | Completion date/time | default `now()` |
| `note` | `text` | Optional notes | nullable |
| `foto_url` | `text` | Optional image | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`; references `manutenzioni_voci`.

### log_uscite
- Purpose: daily coop opening/closing log.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Log row id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `data` | `date` | Day being tracked | unique with `pollaio_id` |
| `ora_uscita` | `time` | Opening time | nullable |
| `ora_rientro` | `time` | Closing time | nullable |
| `note` | `text` | Optional note | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`.

### scorte_cibo
- Purpose: current feed and supply stock entries.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Stock item id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `nome` | `text` | Stock item name | required |
| `quantita` | `numeric` | Current quantity | nullable |
| `unita` | `text` | Unit label | nullable |
| `soglia_avviso` | `numeric` | Low-stock alert threshold | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`; parent table for `scorte_rifornimenti`.

### scorte_rifornimenti
- Purpose: refill log for a stock item.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Refill row id | PK |
| `scorta_id` | `uuid` | Stock item being refilled | FK -> `scorte_cibo.id` |
| `data` | `timestamptz` | Refill date/time | default `now()` |
| `quantita_aggiunta` | `numeric` | Quantity added | required |
| `note` | `text` | Optional notes | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: read/write rules are derived from the parent stock row; members can read, while writes require access to the parent `scorte_cibo` row and admin role on that coop.
- Relationships to other tables: child table of `scorte_cibo`.

### spese
- Purpose: expense ledger.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Expense id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `data` | `date` | Expense date | required |
| `importo_euro` | `numeric(10,2)` | Amount in euro | required |
| `descrizione` | `text` | Expense description | required |
| `categoria` | `text` | Optional category | nullable |
| `note` | `text` | Optional notes | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`.

### note
- Purpose: notes and scheduled reminders.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Note id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `testo` | `text` | Note content | required |
| `data` | `timestamptz` | Note date/time | default `now()` |
| `tag` | `text` | Simple note tag | nullable |
| `foto_url` | `text` | Optional photo | nullable |
| `promemoria_data` | `timestamptz` | Reminder date/time | nullable |
| `promemoria_canale` | `text` | Reminder channel | check `push`, `email`, `entrambi` |
| `promemoria_inviato` | `boolean` | Whether the reminder has already been sent | default `false` |
| `archiviata` | `boolean` | Archive flag | default `false` |
| `created_at` | `timestamptz` | Creation time | default `now()` |
| `updated_at` | `timestamptz` | Last update time | trigger `public.set_updated_at()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`.

### lista_spesa
- Purpose: shared shopping list.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | List item id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `testo` | `text` | Item text | required |
| `categoria` | `text` | Item category | check `cibo`, `lettiera`, `medicinali`, `altro` |
| `quantita` | `text` | Free-text quantity | nullable |
| `comprato` | `boolean` | Bought flag | default `false` |
| `data_acquisto` | `timestamptz` | When it was bought | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`.

### meteo_storico
- Purpose: daily weather snapshots used by statistics and notification logic.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Snapshot id | PK |
| `pollaio_id` | `uuid` | Coop id | FK -> `pollai.id` |
| `data` | `date` | Snapshot date | unique with `pollaio_id` |
| `temp_min` | `numeric` | Minimum temperature | nullable |
| `temp_max` | `numeric` | Maximum temperature | nullable |
| `precipitazioni_mm` | `numeric` | Rainfall in mm | nullable |
| `ore_sole` | `numeric` | Sunshine duration | nullable |
| `condizione` | `text` | Weather summary | nullable |
| `vento_max_kmh` | `numeric` | Max wind speed | nullable |
| `created_at` | `timestamptz` | Creation time | default `now()` |

- RLS policies in effect: members can read; writes are admin-scoped.
- Relationships to other tables: belongs to `pollai`.

### notifiche_inviate
- Purpose: deduplicated record of notifications sent to a specific user.
- Columns:

| Name | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | Notification log id | PK |
| `user_id` | `uuid` | User who received the notification | FK -> `auth.users.id` |
| `categoria` | `text` | Notification category | required |
| `riferimento_id` | `text` | Dedup/reference key | required |
| `inviata_il` | `timestamptz` | Sent time | default `now()` |
| `letta_il` | `timestamptz` | Read time | nullable |

- RLS policies in effect: users can select and update only their own rows. Inserts are performed by backend/admin paths such as `cron-notifications` and `lib/actions/richieste.ts`.
- Relationships to other tables: owned by the user in `auth.users`.

### Database functions and RPCs
- `public.set_updated_at()`: trigger helper used by multiple tables with `updated_at`.
- `public.handle_new_user()`: `auth.users` trigger that creates `profiles` and `preferenze_notifiche`.
- `public.is_my_pollaio(p_pollaio uuid)`: RLS helper that checks whether `auth.uid()` belongs to a coop; anonymous and `PUBLIC` execute were revoked in the security follow-up migrations.
- `public.my_pollaio_role(p_pollaio uuid)`: returns the current member role for a coop; anonymous and `PUBLIC` execute were revoked.
- `public.accept_invito(p_token uuid)`: authenticated RPC that validates the invite email and expiry, upserts membership, marks the invite accepted, and updates `profiles.pollaio_attivo_id`.
- `public.merge_contatto_con_utente(p_contatto, p_utente, p_rinomina?)`: authenticated admin RPC that links a contact to a guest member and merges gift history.
- `public.accetta_richiesta_uova(p_richiesta uuid)`: authenticated admin RPC with row locking that checks egg availability, creates a gift, updates eggs FIFO, and closes the request.
- `public.rifiuta_richiesta_uova(p_richiesta uuid)`: authenticated admin RPC that rejects a pending request.
- `public.animale_in_inserimento(p_animale_id uuid)`: helper that returns whether an animal still has an unfinished insertion timeline.
- `public.public_pollaio_stats(p_slug text)`: intentionally public aggregate RPC used by `/p/[slug]`; remains callable by `anon` and `authenticated` by design.

### Storage bucket
- `poliner-media`: public Supabase Storage bucket for uploaded images. The bucket is made public by `20260520123000_make_poliner_media_public.sql`, and `20260521144434_security_followups_permissions_and_storage.sql` removed a broad storage listing policy. If private media is needed later, this design should be revisited.

## 8. Supabase services
- Runtime Supabase service files live under `lib/supabase/`. Business actions above them live in `lib/actions/` and `app/(app)/**/actions.ts`.

### `lib/supabase/client.ts`
- What it manages: the browser-side Supabase client for client components.
- Exported functions with brief description and params:
  - `createClient()`: no params. Returns a browser client created with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### `lib/supabase/server.ts`
- What it manages: the server-side Supabase client for server components, route handlers, and server actions.
- Exported functions with brief description and params:
  - `createClient()`: no params. Returns a cookie-aware server client; if cookies cannot be set in the current context, middleware is expected to refresh the session instead.

### `lib/supabase/admin.ts`
- What it manages: privileged server-only access that bypasses RLS.
- Exported functions with brief description and params:
  - `createAdminClient()`: no params. Returns a client initialized with `SUPABASE_SERVICE_ROLE_KEY`; used in places such as invite creation, push delivery, and member/profile lookups that must bypass RLS.

### `lib/supabase/public.ts`
- What it manages: anonymous, no-cookie access for public pages.
- Exported functions with brief description and params:
  - `createPublicClient()`: no params. Returns a non-persistent client for routes such as `app/(public)/p/[slug]/page.tsx`.

### `lib/supabase/middleware.ts`
- What it manages: request-time session refresh and route redirection.
- Exported functions with brief description and params:
  - `updateSession(request: NextRequest)`: receives the current request, refreshes the Supabase session cookies, allows public auth paths (`/login`, `/registrazione`, `/reset-password`, `/auth/callback`), leaves open paths (`/invito`, `/p/`) untouched, redirects anonymous users to `/login`, and redirects already-signed-in users away from auth pages back to `/`.

### `lib/supabase/queries.ts`
- What it manages: server-side access guards and active-coop resolution.
- Exported functions with brief description and params:
  - `requireUser()`: no params. Returns `{ supabase, user }` or redirects to `/login`.
  - `requirePollaio()`: no params. Returns `{ supabase, user, pollaio, ruolo, pollai, pollaiConRuolo, profile }`, auto-fixes an invalid `pollaio_attivo_id`, and redirects users with no coop to `/onboarding`.

### `lib/supabase/database.types.ts`
- What it manages: generated TypeScript types for tables, enums, RPCs, and relationships.
- Exported types with brief description:
  - `Database`: full generated schema type.
  - `Tables<...>`: helper generic for table row access.
  - RPC signatures for functions such as `accept_invito`, `accetta_richiesta_uova`, `public_pollaio_stats`, and the enum `tipo_evento_inserimento`.

## 9. Environment variables
| Variable | Required | Description | Where to set |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Base Supabase project URL used by browser, server, and middleware clients | `.env.local` for local app, Cloudflare Worker env for deployed app |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase anon key used by browser and SSR clients | `.env.local`, Cloudflare Worker env |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for admin features and Edge Functions | Privileged key for `createAdminClient()` and server-to-server Supabase access | Cloudflare Worker env, Supabase Edge Function secrets |
| `SUPABASE_URL` | Yes for Edge Functions | Supabase base URL used inside `send-push` and `cron-notifications` | Supabase Edge Function secrets |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes for browser push | Public VAPID key used by `lib/push/client.ts` and settings UI | `.env.local`, Cloudflare Worker env |
| `VAPID_PUBLIC_KEY` | Yes for Edge Functions; duplicated in app fallback | Public VAPID key used by `lib/push/server.ts` and Supabase Edge Functions | Supabase Edge Function secrets, optionally app env |
| `VAPID_PRIVATE_KEY` | Yes for push delivery | Private VAPID key used when sending push notifications | `.env.local`, Supabase Edge Function secrets |
| `VAPID_SUBJECT` | No | VAPID contact subject; defaults to `mailto:info@rdlabs.digital` | `.env.local`, Supabase Edge Function secrets |
| `RESEND_API_KEY` | No, unless email delivery is enabled | Resend API key for invites and email notifications | Supabase Edge Function secrets |
| `RESEND_FROM` | No | Sender string for Resend emails; defaults to `Poliner <info@rdlabs.digital>` | Supabase Edge Function secrets |
| `SEND_EMAIL_FUNCTION_TOKEN` | Recommended | Dedicated internal token for the `send-email` Edge Function | Cloudflare Worker env and Supabase Edge Function secrets |
| `SUPABASE_SECRET_KEY` | No, legacy fallback | Older fallback token still accepted by `lib/actions/inviti.ts` | Avoid new use; only keep if legacy deploys still need it |
| `SUPABASE_SECRET_KEYS` | No | Optional comma-separated accepted secrets for `cron-notifications` | Supabase Edge Function secrets |
| `NEXT_PUBLIC_APP_URL` | One of this or `NEXT_PUBLIC_SITE_URL` in production | Base URL used to build invite links | `.env.local`, Cloudflare Worker env |
| `NEXT_PUBLIC_SITE_URL` | Optional legacy fallback | Older alternative for invite-link base URL | `.env.local`, Cloudflare Worker env |
| `NODE_ENV` | Runtime-provided | Enables production-only PWA behavior and affects CSP rules | Set automatically by Next.js / deployment runtime |

- Notes:
  - The repo currently uses overlapping names for some settings. `NEXT_PUBLIC_APP_URL` vs `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` vs `VAPID_PUBLIC_KEY`, and the `SEND_EMAIL_FUNCTION_TOKEN` fallback chain should be simplified later.
  - Edge Function secrets are configured separately from the Next.js app env vars.

## 10. Local development setup
1. Install Node.js `>= 18.17`. The repository `README.md` uses `nvm use 22`, and the security report confirms older Node versions can break builds.
2. Install dependencies with `npm install`.
3. Create `.env.local` with at least `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and any server-side values you want to test locally such as `SUPABASE_SERVICE_ROLE_KEY` and push/email settings.
4. If you want browser push locally, run `node scripts/gen-vapid-keys.mjs`. It prints VAPID keys and updates `.env.local` if that file already exists.
5. If you want Edge Function push/email flows to work, copy the relevant values into Supabase Edge Function secrets as described in `README.md`.
6. Start the app with `npm run dev`.
7. Open `http://localhost:3000`.
8. Use `npm run typecheck` to run `tsc --noEmit` and `npm run lint` to run Next.js linting.
9. If you need updated DB types, run `npm run supabase:types`.
10. For PWA, offline, and push behavior, use `npm run build && npm run start` instead of `npm run dev`, because `next-pwa` is disabled in development.

- Local Supabase note: the checked-in workflow looks tied to a linked remote Supabase project rather than a fully documented local Supabase stack. A full local Supabase workflow is `⚠️ needs verification` because the repo does not include a local `supabase/config.toml` setup guide.

## 11. Deployment
- Frontend deployment to Cloudflare is handled by `npm run deploy`, which runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy -- --keep-vars`.
- A CI workflow is `⚠️ needs verification`: there is no checked-in GitHub Actions or other CI file in this repository, so the documented deploy path is the command in `package.json`.
- Manual steps usually required after deployment:
  - Make sure the Cloudflare Worker environment has the same app-side env vars used locally, especially the Supabase URL/key pair and any push-related public values.
  - Make sure Supabase Edge Functions have their own secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_*`, `RESEND_*`, `SEND_EMAIL_FUNCTION_TOKEN`, and optionally `SUPABASE_SECRET_KEYS`.
  - Redeploy Supabase Edge Functions when code or secrets change. The repo does not include a dedicated script for this, so the exact command is `⚠️ needs verification`.
  - Keep the scheduler aligned with `scripts/setup-pg-cron.sql` if the `cron-notifications` function URL or authentication secret changes.
- Managing Supabase migrations:
  - Schema changes live in `supabase/migrations/` as ordered SQL files.
  - Apply them with the Supabase CLI in the linked project workflow. The exact team command is `⚠️ needs verification`, but the repo already assumes Supabase CLI usage through `npm run supabase:types` and the migration directory.
  - After a schema change, regenerate `lib/supabase/database.types.ts` with `npm run supabase:types`.

## 12. Known limitations & future improvements
- Large client components are still monolithic: `app/(app)/galline/[id]/ChickenDetail.tsx`, `app/(app)/impostazioni/ImpostazioniClient.tsx`, `app/onboarding/OnboardingFlow.tsx`, and `app/(app)/manutenzione/ManutenzioneClient.tsx` were explicitly deferred in `REFACTORING_SUMMARY.md`.
- The PWA push layer is still split across `next-pwa`, `worker/index.js`, `public/push-sw.js`, and worker migration logic in `lib/push/client.ts`. The final single-worker target is `⚠️ needs verification`.
- Guest permissions are not fully centralized. The UI labels guests as read-only, but several route action files such as `app/(app)/galline/actions.ts`, `app/(app)/uova/actions.ts`, `app/(app)/note/actions.ts`, and `app/(app)/scorte/actions.ts` only call `requirePollaio()` and do not perform an explicit admin check. In addition, `20260521103000_fix_public_page_member_policy_roles.sql` relaxes `animali` writes back to member scope. If guests must be strictly read-only, this needs review.
- Some private pages still use broad `.select("*")` queries, which the security report already calls out as low-risk but worth narrowing over time.
- Remaining security work from `SECURITY_REPORT.md` is still open: private SECURITY DEFINER RPC advisor warnings, the `pg_net` extension still living in `public`, leaked-password protection disabled in Supabase Auth, the legacy service-role fallback in the email flow, a coordinated dependency upgrade branch, and `.dev.vars` still tracked in git.
- Environment variable naming has drift and should be simplified: `NEXT_PUBLIC_APP_URL` vs `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` vs `VAPID_PUBLIC_KEY`, and the `SEND_EMAIL_FUNCTION_TOKEN ?? SUPABASE_SECRET_KEY ?? SUPABASE_SERVICE_ROLE_KEY` fallback chain.
- `next-pwa` is still in use even though it is listed as a high-risk dependency to revisit.
- The repo still lacks a checked-in `.env.local.example`, a documented local Supabase workflow, and a committed CI pipeline.
- The production URL, live user count, and exact function-deployment command are all `⚠️ needs verification` because they are not encoded in the repository.