import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poliner — Il tuo pollaio digitale",
  description:
    "La memoria digitale del tuo pollaio. Galline, uova, manutenzione e meteo, tutto in un posto solo.",
  applicationName: "Poliner",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Poliner",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#E8678A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <div className="app-frame-desktop h-dvh flex justify-center">
          <div className="app-frame">{children}</div>
        </div>
      </body>
    </html>
  );
}
