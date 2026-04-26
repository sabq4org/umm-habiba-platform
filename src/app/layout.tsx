import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة أم حبيبة التعليمية",
  description: "منصة داخلية لإدارة متوسطة أم حبيبة التعليمية بصبيا",
};

/**
 * Runs synchronously in the browser BEFORE React hydrates, so the page renders
 * with the correct theme on the very first paint (no flash of light theme for
 * dark-mode users). Reads a manual override from localStorage and otherwise
 * falls back to the OS-level `prefers-color-scheme`.
 */
const themeBootstrapScript = `
(function() {
  try {
    var stored = window.localStorage.getItem('umh-theme');
    var prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme =
      stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable} suppressHydrationWarning>
      <head>
        <script
          // Must be inline + synchronous to beat the first paint.
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
