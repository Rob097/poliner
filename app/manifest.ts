import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poliner — Il tuo pollaio digitale",
    short_name: "Poliner",
    description:
      "La memoria digitale del tuo pollaio: galline, uova, manutenzione, meteo.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF8F6",
    theme_color: "#E8678A",
    lang: "it",
    categories: ["lifestyle", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
