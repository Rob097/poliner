import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const authStorageKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;

const PUBLIC_PATHS = [
  "/login",
  "/registrazione",
  "/reset-password",
  "/auth/callback",
];

// Path accessibili sia da loggati che non loggati (no redirect)
const OPEN_PATHS = ["/invito", "/p/"];

function isSupabaseAuthCookie(name: string) {
  return (
    name === authStorageKey ||
    name.startsWith(`${authStorageKey}.`) ||
    name === `${authStorageKey}-code-verifier` ||
    name.startsWith(`${authStorageKey}-code-verifier.`) ||
    name === `${authStorageKey}-user` ||
    name.startsWith(`${authStorageKey}-user.`)
  );
}

function isMissingRefreshTokenError(error: unknown): error is { code: string } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "refresh_token_not_found",
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const cookiesToClear = new Set<string>();

  const queueAuthCookieCleanup = () => {
    for (const { name } of request.cookies.getAll()) {
      if (!isSupabaseAuthCookie(name)) continue;
      cookiesToClear.add(name);
      request.cookies.delete(name);
    }
  };

  const withQueuedCookieCleanup = (nextResponse: NextResponse) => {
    for (const name of cookiesToClear) {
      nextResponse.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
    return nextResponse;
  };

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let isAuthenticated = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      throw error;
    }
    isAuthenticated = Boolean(data?.claims?.sub);
  } catch (error) {
    if (isMissingRefreshTokenError(error)) {
      queueAuthCookieCleanup();
    } else {
      throw error;
    }
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isOpen = OPEN_PATHS.some((p) => pathname.startsWith(p));

  if (!isAuthenticated && !isPublic && !isOpen) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withQueuedCookieCleanup(NextResponse.redirect(url));
  }

  if (isAuthenticated && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withQueuedCookieCleanup(NextResponse.redirect(url));
  }

  return withQueuedCookieCleanup(response);
}
