import withPWAInit from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

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
    // Supabase API (REST/auth): network-first con fallback su cache
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth)\/v1\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-api",
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
