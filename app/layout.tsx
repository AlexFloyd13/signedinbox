import type { Metadata } from "next";
import { Lora, DM_Sans } from "next/font/google";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "signedinbox — Verified Email Stamps",
  description: "Attach a verified stamp to any email you send. Recipients confirm it's really from you in one click — no app needed.",
  metadataBase: new URL("https://signedinbox.com"),
  openGraph: {
    title: "signedinbox",
    description: "Verified email stamps — prove every email is really from you",
    url: "https://signedinbox.com",
    siteName: "signedinbox",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} ${dmSans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
