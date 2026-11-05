"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="celestia-theme-light-default">
      {children}
    </ThemeProvider>
  );
}
