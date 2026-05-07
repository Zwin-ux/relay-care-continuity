import type { Metadata } from "next";
import "@coinbase/cds-icons/fonts/web/icon-font.css";
import "@coinbase/cds-web/defaultFontStyles";
import "@coinbase/cds-web/globalStyles";
import { CdsProviders } from "@/components/CdsProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "RELAY Care Continuity",
  description: "Mock wildfire reports grouped for review with no live dispatch connection.",
  icons: {
    icon: "/brand/relay-mark.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CdsProviders>{children}</CdsProviders>
      </body>
    </html>
  );
}
