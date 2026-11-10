import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Project Celestia — Vedic Astrology",
  description: "A personal dashboard for Vedic astrology, charts, and numerology.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {clerkConfigured ? (
          <ClerkProvider>
            <Providers>{children}</Providers>
          </ClerkProvider>
        ) : <Providers>{children}</Providers>}
      </body>
    </html>
  );
}