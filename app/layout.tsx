import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LastClass — learn it until you can teach it",
  description:
    "An adaptive learning system that climbs you through five rungs of understanding, then makes you teach it to a room that won't let anything slide.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Applies the saved theme before first paint, so it never flashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('lastclass:theme');" +
              "document.documentElement.dataset.theme=t||'daylight'}" +
              "catch(e){document.documentElement.dataset.theme='daylight'}",
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-md)] focus:bg-[var(--color-accent)] focus:px-4 focus:py-2 focus:text-[var(--on-accent)]"
        >
          Skip to content
        </a>
        <div className="room" aria-hidden="true" />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
