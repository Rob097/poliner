# Refactoring summary

Multi-phase refactor following the audit. Three commits, scoped to safe
mechanical wins. Component splits and the in-flight push migration were
deferred intentionally — see the bottom of this document.

Each phase below ends with a green `npx tsc --noEmit` (0 errors).

---

## Phase 1 — Folder structure (commit `144fa01`)

### Deleted
- `typecheck_output.txt` (root, 280 lines) — stale `tsc` log committed
  in `417b9cd`; superseded (typecheck is now clean).
- `docs/Poliner-handoff.zip` — original Claude Design handoff bundle
  no longer needed after implementation.

### Moved
- `new-features.md` → `docs/new-features.md` (root no longer the home
  for planning docs).

### Added
- `lib/types/action-result.ts` — single canonical `ActionResult { ok,
  error? }` for every server action.
- `lib/types/domain.ts` — `Tipo`, `RuoloPollaio`, `StatoUovo`,
  `Conservazione` literals.
- `lib/types/index.ts` — barrel.
- `lib/queries/` — new directory for per-page Supabase read services.
  Currently contains only `home.ts` (see Phase 2) and a `README.md`
  documenting the convention.

### Gitignore
- Added `typecheck_output.txt`.
- `tsconfig.tsbuildinfo` was already covered by `*.tsbuildinfo`.
- `docs/handoff/` was already covered.

---

## Phase 2 — Supabase centralization & duplicate logic removal (commit `56a49b4`)

### Added
- `lib/queries/home.ts` (~330 lines) — single `loadHomeData()` that
  runs all 13 parallel queries the home page needs, with per-query
  `console.error` logging on failures (was silent before). Returns
  a normalized `HomeData` shape ready for the page renderer.
- `lib/actions/auth.ts` — `signOutAction()` extracted from
  `app/onboarding/actions.ts` to its proper home. The old definition
  in onboarding was unused; this version is now wired into
  `ImpostazioniClient`.
- `lib/utils/date.ts` gained `MS_DAY`, `MESI_BREVI`, `MESI_LUNGHI`,
  `GIORNI`, `todayIso()`, `startOfTodayIso()` as the canonical
  date primitives for the rest of the codebase.

### Changed
- `app/(app)/page.tsx`: 566 → 385 lines. All Supabase work delegated
  to `loadHomeData`. The page is now just rendering + alert assembly.
- `app/api/push/test/route.ts`: 70 → 27 lines. Dropped the duplicated
  VAPID setup + dead-endpoint cleanup; delegates to `lib/push/server
  .sendPushToUser()`.
- `app/(app)/impostazioni/ImpostazioniClient.tsx`: client-side
  `createClient().auth.signOut()` replaced with `signOutAction()`.
- `lib/utils/meteo.ts`: imports `GIORNI`, `MS_DAY`, `todayIso` from
  `./date` instead of redeclaring them.

---

## Phase 3 — Deduplication, error contract, dependency hygiene (commit `0bd42b6`)

### `ActionResult` unification
- The single canonical interface lives in `lib/types/action-result.ts`.
- `lib/actions/{pollaio,richieste,inviti,uscite}.ts` dropped their
  local `interface ActionResult { ok, errore? }` declarations and now
  import the canonical one. Every return value was switched from
  `errore:` to `error:`.
- `CreaInvitiResult` and `CreaAccountDaInvitoResult` in
  `lib/actions/inviti.ts` now `extends ActionResult` instead of
  re-spelling the `{ ok, error }` fields.
- The 7 route-local action files in `app/(app)/*/actions.ts` that
  declared a local `ActionResult` with an extra `id?: string` were
  left as superset-of-canonical (already used `error?`). Files that
  didn't need the extra `id` (`impostazioni`, `manutenzione`) now
  import the canonical type directly.

### Caller updates (`.errore` → `.error`)
All readers of action results updated:
- `components/layout/PollaioSwitcher.tsx`
- `components/uova/RichiesteSection.tsx`
- `components/home/AperturaChiusuraCard.tsx`
- `app/(app)/uscite/UsciteClient.tsx`
- `app/(app)/impostazioni/membri/MembriClient.tsx`
- `app/invito/[token]/page.tsx`
- `app/invito/[token]/InvitoClient.tsx`

### Postgres RPC types (intentionally preserved)
`accetta_richiesta_uova`, `rifiuta_richiesta_uova`, `accept_invito`
return JSON with an `errore` field. The local `RpcResult` types in
`lib/actions/{richieste,inviti}.ts` keep `errore?:` because that is the
real DB field name; the wrapping action then translates to `error` in
the outer `ActionResult`. Marked with comments.

### Constants & literals dedup
- `MS_DAY = 1000 * 60 * 60 * 24` removed from `lib/utils/{stats,
  manutenzione,muta,uova,eta}.ts` — they all import from `lib/utils
  /date.ts` now.
- `eta.ts` now uses a derived `MS_MESE = MS_DAY * 30.44`.
- `MESI_BREVI` lowercase array in `lib/utils/stats.ts` was kept as
  a local because it's capitalized (`"Gen"` vs the lowercase `"gen"`
  in date.ts) for chart labels — different semantic.
- `GIORNI_SETTIMANA` array in `lib/utils/meteo.ts` removed; uses the
  canonical `GIORNI` from `lib/utils/date.ts`.
- `tipo: "gallina" | "gallo"` literal replaced with `import type
  { Tipo } from "@/lib/types"` in `lib/utils/{avatar,eta}.ts` and
  `app/(app)/galline/{nuova,[id]/modifica}/...Form.tsx`.
- `ruolo: "admin" | "guest"` literal replaced with `RuoloPollaio` in
  `lib/actions/inviti.ts` (3 sites). Other call sites left as-is.

### `todayIso()` adoption
`new Date().toISOString().slice(0, 10)` replaced with `todayIso()` in:
- `lib/actions/uscite.ts` (was a private `oggiIso()` helper — removed)
- `app/(app)/galline/actions.ts` (6 sites)
- `app/(app)/galline/[id]/ChickenDetail.tsx`
- `app/(app)/galline/[id]/modifica/ModificaGallinaForm.tsx` (2)
- `app/(app)/galline/nuova/NuovaGallinaForm.tsx` (2)
- `components/galline/SegnaDefuntaSheet.tsx`
- `components/galline/AggiungiEventoInserimentoSheet.tsx`
- `app/(app)/spese/SpeseClient.tsx` (2)
- `app/(app)/uscite/UsciteClient.tsx`

The full-timestamp call `new Date().toISOString()` (no `.slice`) is
correctly left alone where present.

### Dependencies
- Removed `webpack` from `dependencies` (was unused; Next.js pulls
  it transitively).
- Moved `@types/web-push` from `dependencies` to `devDependencies`.
- `package-lock.json` regenerated.

---

## Verification

- `npx tsc --noEmit` passes with **0 errors** after each phase.
- No `any` usage in the codebase (`as any` count: 0).
- Three commits, one per phase, can be reverted independently if needed.

---

## Deferred (with rationale)

These items from the audit were intentionally **not** done in this
session. Each has a specific reason; none are blockers for the work
that was done.

### Component splits
Per the upfront decision: the four monster client components
- `app/(app)/galline/[id]/ChickenDetail.tsx` (1189 lines)
- `app/(app)/impostazioni/ImpostazioniClient.tsx` (1102 lines)
- `app/onboarding/OnboardingFlow.tsx` (576 lines)
- `app/(app)/manutenzione/ManutenzioneClient.tsx` (547 lines)

were not split. Splitting 3400+ lines of stateful client code without
the ability to QA in a browser is high-risk. Recommended approach for
a follow-up session: one component per session, each with a manual
verification pass.

### Service-worker push handler dedup
`worker/index.js` (`@ducanh2912/next-pwa` custom worker) and `public/push-sw.js`
have near-identical push/notificationclick handlers. They were left
alone because the codebase is mid-migration: `components/layout/
AppShell.tsx` now calls `migratePushSubscriptionToAppWorker()` to
move existing subscriptions off the legacy `/sw.js` scope and onto
`/push-sw.js`. Touching either worker file during a migration risks
breaking the migration itself. After the migration lands and the
legacy path can be deleted entirely, this dedup becomes trivial.

### `as unknown as RowType` casts (~20 occurrences)
These show up where Supabase's generated `database.types.ts` collapses
on joined selects (`pollai:pollaio_id(*)`, `animali(nome)`). The audit
listed regenerating `database.types.ts` as the right fix; that requires
the Supabase CLI and live DB access, so it was left out. Once types are
regenerated, the casts should be replaceable with `.returns<T>()` typed
selects.

### Per-entity service files (e.g. `lib/queries/galline.ts`,
`lib/queries/uova.ts`, …)
Only the home page's loader was created. Centralizing reads for the
other ~12 pages is mechanical but volumetric; it would balloon this
refactor. The pattern is documented in `lib/queries/README.md` so the
next entity loader can follow it.

### `lib/constants/messages.ts` for "Ops, riprova!" etc.
~60 literal copies of "Ops, riprova!" across actions and toasts.
Consolidating would clarify intent but doesn't change behavior; left
for a copy/UX-driven pass.

### PWA stack follow-up after the `next-pwa` migration
The highest-risk part of the audit was addressed by moving from the
abandoned `next-pwa` package to `@ducanh2912/next-pwa` and by pinning
modern Workbox packages. What remains out of scope here is the broader
PWA simplification work: converging on a single worker path, reducing
migration code, and validating whether a future move to a different
PWA integration would let the project drop the current webpack-only
build requirement.

### VAPID + send-email env var chains
- `VAPID_PUBLIC_KEY ?? NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `lib/push/
  server.ts`
- `SEND_EMAIL_FUNCTION_TOKEN ?? SUPABASE_SECRET_KEY ??
  SUPABASE_SERVICE_ROLE_KEY` in `lib/actions/inviti.ts`

Both fallback chains were left intact. Removing entries from these
chains has deploy implications (whatever value is currently set in
production / Supabase secrets needs to match the kept name first).
Safer to do in a coordinated config change.

### Other audit items not addressed
- `cloudflare-env.d.ts` generation
- Reconciling `v1.1` display string vs `package.json 0.1.0`
- `.env.local.example`
- CI workflow
- ESLint 9 upgrade

All are low-risk follow-ups that don't fit a code-refactor pass.
