import type { ReactNode } from "react";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import Chrome from "@/components/Chrome";
import "./globals.css";

const dm = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], style: ["normal", "italic"], variable: "--font-display" });
export const metadata = {
  title: "The Champions Club",
  description: "Two tennis courts, a cricket court, a gear shop and a bar. One club, open 6 AM to 10 PM.",
  icons: { icon: "/favicon.svg" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dm.variable} ${barlow.variable}`}>
      <body>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
