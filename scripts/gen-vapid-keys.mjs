// Genera VAPID keys per Web Push e (se possibile) le scrive in .env.local
// Esegui: node scripts/gen-vapid-keys.mjs
import webpush from "web-push";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env.local");

const keys = webpush.generateVAPIDKeys();
console.log("VAPID public key:", keys.publicKey);
console.log("VAPID private key:", keys.privateKey);

if (existsSync(ENV_PATH)) {
  let env = readFileSync(ENV_PATH, "utf8");
  env = env.replace(
    /NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*/,
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`,
  );
  env = env.replace(
    /VAPID_PRIVATE_KEY=.*/,
    `VAPID_PRIVATE_KEY=${keys.privateKey}`,
  );
  writeFileSync(ENV_PATH, env);
  console.log("\n✓ Chiavi VAPID scritte in .env.local");
  console.log("\n⚠ Aggiungile anche come secrets nelle Edge Functions Supabase:");
  console.log("  supabase secrets set VAPID_PUBLIC_KEY=...");
  console.log("  supabase secrets set VAPID_PRIVATE_KEY=...");
} else {
  console.log("\n⚠ .env.local non trovato — copia manualmente le chiavi.");
}
