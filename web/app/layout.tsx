import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AutoKit Dashboard",
  description: "Premiere/AE/PS automation dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen">{children}</body>
    </html>
  );
}
