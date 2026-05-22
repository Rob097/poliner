import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "docs/handoff/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
    "public/sw.js",
    "public/fallback-*.js",
    "public/worker-*.js",
    "public/workbox-*.js",
  ]),
]);