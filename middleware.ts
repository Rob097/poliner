import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image, favicon.ico, icons, sw.js, manifest.webmanifest
     * - Public assets in /public
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw\\.js|workbox-|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)",
  ],
};
