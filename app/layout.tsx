import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Тихо — чистая мебель, спокойный дом",
  description:
    "Выездная химчистка мебели. Рассчитайте стоимость и отправьте фото мастеру.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
