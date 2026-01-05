import type { Metadata } from "next";
import "./globals.css";
import ClientProvider from "@/components/ui/ClientProvider";

export const metadata: Metadata = {
  title: "TaxComply NG - Stay Compliant. Avoid Penalties.",
  description: "Nigeria-first tax compliance and e-invoicing SaaS platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}
