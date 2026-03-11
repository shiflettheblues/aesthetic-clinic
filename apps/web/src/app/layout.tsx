import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Dr Skin Central — Aesthetic Treatments in Ipswich",
  description: "Expert aesthetic treatments including anti-wrinkle injections, dermal fillers, laser hair removal, skin boosters and more. Book online today.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
