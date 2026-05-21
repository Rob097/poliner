import withPWAInit from "next-pwa";

const isProd = process.env.NODE_ENV === "production";
const contentSecurityPolicy = `
  default-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  object-src 'none';
  script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"} blob:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org;
  worker-src 'self' blob:;
  manifest-src 'self';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

if (!isProd) {
  try {
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    initOpenNextCloudflareForDev();
  } catch (error) {
    const isMissingOpenNextPackage =
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      String(error?.message ?? "").includes("@opennextjs/cloudflare");

    if (!isMissingOpenNextPackage) {
      throw error;
    }

    console.warn(
      "next.config.mjs: @opennextjs/cloudflare non installato; continuo senza initOpenNextCloudflareForDev().",
    );
  }
}

const withPWA = withPWAInit({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
  buildExcludes: [/static\/media\/.*\.(?:woff|woff2)$/i],
  // Fallback per pagine non in cache quando offline
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    // Fonts Google: cache-first, lunga durata
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    // Foto da Supabase Storage: stale-while-revalidate, lunga durata
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "supabase-storage",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Open-Meteo: 2h cache, network-first
    {
      urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "meteo",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 2 },
      },
    },
    // Supabase REST: network-first con fallback su cache.
    // Non cacheiamo auth/v1 per evitare di persistere risposte di sessione/token.
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-rest",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Immagini statiche
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "images",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // JS / CSS / font locali
    {
      urlPattern: /\.(?:js|css|woff2?)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // HTML pages: network-first per freschezza
    {
      urlPattern: ({ request }) => request.destination === "document",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    // Fallback generico
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "others",
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default withPWA(nextConfig);
