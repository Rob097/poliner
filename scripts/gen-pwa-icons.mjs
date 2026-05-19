// Genera icone PWA placeholder (rosa con uovo bianco al centro).
// Esegui: node scripts/gen-pwa-icons.mjs
// Dependency dev: sharp

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/icons");
mkdirSync(OUT, { recursive: true });

function svg(size, paddingPct) {
  const innerSize = size - size * paddingPct * 2;
  const eggRX = innerSize * 0.32;
  const eggRY = innerSize * 0.4;
  const cx = size / 2;
  const cy = size / 2 + innerSize * 0.04;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#E8678A"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${eggRX}" ry="${eggRY}" fill="#FFF0F3"/>
    <ellipse cx="${cx - innerSize * 0.05}" cy="${cy - innerSize * 0.08}" rx="${eggRX * 0.45}" ry="${eggRY * 0.35}" fill="#ffffff" opacity="0.6"/>
  </svg>`;
}

const tasks = [
  { name: "icon-192.png", size: 192, pad: 0.1 },
  { name: "icon-512.png", size: 512, pad: 0.1 },
  { name: "icon-maskable-512.png", size: 512, pad: 0.2 },
];

for (const t of tasks) {
  const buf = await sharp(Buffer.from(svg(t.size, t.pad))).png().toBuffer();
  writeFileSync(`${OUT}/${t.name}`, buf);
  console.log("Generated", t.name);
}
