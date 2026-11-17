import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { EnglishToggle } from "@/components/english-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Every route must be fully prerendered: content only changes when the JSON files change. */
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: { default: "PD3 mundtlig – practice", template: "%s · PD3 mundtlig" },
  description:
    "Practise the oral part of Prøve i Dansk 3: past exam questions, suggested answers with Danish audio, and timed mock exams.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const nav = [
  { href: "/sets", label: "Questions" },
  { href: "/mock-exam", label: "Mock exam" },
  { href: "/delproeve-1", label: "Delprøve 1" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold">
              PD3 <span lang="da">mundtlig</span>
            </Link>
            <nav aria-label="Main" className="flex gap-4 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <EnglishToggle />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t">
          <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-foreground">
            Exam questions and pictures: Styrelsen for International
            Rekruttering og Integration (SIRI), public sets up to May–June 2024,
            for personal study only. Suggested answers are AI-written and not
            official.
          </p>
        </footer>
      </body>
    </html>
  );
}
