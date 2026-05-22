# Security Report

## Fixed

- Blocked open redirects from untrusted `next` parameters in `app/auth/callback/route.ts`, `app/(auth)/login/page.tsx`, and `lib/utils/internal-redirect.ts`.
- Marked secret-bearing server modules as server-only in `lib/supabase/server.ts`, `lib/supabase/admin.ts`, and `lib/push/server.ts`.
- Added payload validation and generic internal-error handling to push subscription APIs in `app/api/push/subscribe/route.ts` and `app/api/push/unsubscribe/route.ts`.
- Validated invite tokens as UUIDs and stopped leaking provider/internal error text in `lib/actions/inviti.ts`, `app/invito/[token]/InvitoClient.tsx`, `app/(auth)/registrazione/page.tsx`, and `supabase/functions/send-email/index.ts`.
- Narrowed overbroad data selection to required columns in `app/(app)/impostazioni/page.tsx` and `supabase/functions/cron-notifications/index.ts`.
- Added baseline security headers and removed Supabase auth-response caching from the PWA runtime in `next.config.mjs`.
- Applied Supabase migration `20260521144434_security_followups_permissions_and_storage` to revoke anonymous execute from non-public SECURITY DEFINER RPCs and drop the broad `poliner_media_authenticated_read` storage listing policy.
- Applied Supabase migration `20260521144527_security_followups_public_execute_cleanup` to revoke remaining effective `PUBLIC` execute grants from non-public SECURITY DEFINER RPCs.

## Requires manual action

- Remaining SECURITY DEFINER RPC warnings.
  Anonymous exposure has been removed for every non-public RPC. The remaining advisor warnings are:

  - intentionally public `public.public_pollaio_stats(text)` for the public page;
  - authenticated-only RPCs still callable through the exposed API: `accept_invito`, `accetta_richiesta_uova`, `rifiuta_richiesta_uova`, `merge_contatto_con_utente`, `my_pollaio_role`, `is_my_pollaio`.

  To eliminate these warnings, move the private RPCs behind server-only boundaries or into a private schema, then revoke direct `authenticated` execute where no client-side RPC access is required. Keep `public_pollaio_stats` public only if you intentionally want the REST RPC endpoint to stay reachable anonymously.

- `pg_net` is still installed in the exposed `public` schema.
  Attempted remediation on the live project:

  ```sql
  alter extension pg_net set schema extensions;
  ```

  Result: `ERROR: extension "pg_net" does not support SET SCHEMA`.

  This needs a Supabase-supported remediation path. Do not drop/recreate `pg_net` on the live project without confirming the impact on the scheduled `net.http_post(...)` cron job.

- Supabase leaked password protection is disabled.
  Enable it in Supabase Dashboard -> Authentication -> Password security.

- The email function still accepts `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback when `SEND_EMAIL_FUNCTION_TOKEN` is missing.
  Recommended rollout:

  1. Set a dedicated `SEND_EMAIL_FUNCTION_TOKEN` in both the Next.js app and the `send-email` function.
  2. Verify invite email delivery end-to-end.
  3. Remove the legacy service-role fallback from `lib/actions/inviti.ts` and `supabase/functions/send-email/index.ts`.

- Dependency vulnerabilities from `npm audit` still need periodic review after the upgrade branch.
  Current state after the dependency modernization:

  - the app is now on `next@16.2.6`, `react@19.2.6`, `eslint-config-next@16.2.6`, `@opennextjs/cloudflare@1.19.11`, and `wrangler@4.94.0`;
  - the abandoned `next-pwa` chain was removed in favor of `@ducanh2912/next-pwa`, and `workbox-build` / `workbox-webpack-plugin` are pinned to `7.4.1` via `overrides`;
  - the previous high-severity `serialize-javascript` / legacy Workbox chain is no longer present;
  - remaining `npm audit` findings are currently moderate-only and come from upstream nested dependencies in the Next/OpenNext/PWA toolchain.

  Treat future audit work as compatibility updates with validation, not as `npm audit fix --force` candidates.

- `.dev.vars` is tracked in git.
  It currently contains only `NEXTJS_ENV=development`, but do not store secrets in it unless you first stop tracking it:

  1. Copy reusable defaults into `.dev.vars.example`.
  2. Run `git rm --cached .dev.vars`.
  3. Keep real deploy secrets in Cloudflare with `wrangler secret put ...`.

## Informational

- Live Supabase table audit: all public tables currently have RLS enabled. No public table was found with RLS disabled.
- Live Supabase follow-up: the bucket listing policy has been removed, and effective anonymous execute has been reduced so only the intentionally public `public_pollaio_stats(text)` RPC still remains anonymously callable.
- Auth/session enforcement is present on the private app surface via `proxy.ts`, `lib/supabase/middleware.ts`, and the server helpers in `lib/supabase/queries.ts`. The intentionally open/public surfaces are login/registration/reset, auth callback, invite pages, and `/p/*`.
- No `dangerouslySetInnerHTML` or similar raw HTML sinks were found in app/components. The invite email template in `lib/actions/inviti.ts` escapes user-controlled fields before HTML composition.
- No frontend use of `SUPABASE_SERVICE_ROLE_KEY` was found. The admin client is now additionally protected by `server-only` imports.
- Authenticated domain pages still contain some `.select("*")` queries in places like `app/(app)/galline/page.tsx`, `app/(app)/rubrica/[id]/page.tsx`, `app/(app)/note/page.tsx`, `app/(app)/scorte/page.tsx`, `app/(app)/spese/page.tsx`, `app/(app)/lista-spesa/page.tsx`, and `app/(app)/uova/nidi/page.tsx`. These are RLS-protected and currently low-risk in this private app, but they should be narrowed over time for least privilege and payload hygiene.
- `.env.local` contains live local secrets but is ignored and not tracked by git in this workspace. No committed `.env` leak was detected from this audit. Rotate those secrets if that file has ever been shared outside this machine.
- Validation run:

  - `npm run typecheck` passed after the fixes.
  - `npm run lint` passed after the dependency and auth/PWA follow-up changes.
  - `npm run build` passed with Node.js `22.16.0` after the Next 16 / PWA migration updates.
  - Supabase migrations applied successfully: `20260521144434_security_followups_permissions_and_storage`, `20260521144527_security_followups_public_execute_cleanup`.