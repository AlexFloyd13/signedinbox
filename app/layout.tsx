import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SignedInbox — Cryptographically Verified Email Stamps",
  description: "Prove you're a real human sender. SignedInbox stamps your emails with an Ed25519 digital signature — independently verifiable by any recipient.",
  metadataBase: new URL("https://signedinbox.com"),
  openGraph: {
    title: "SignedInbox",
    description: "Cryptographically verified email identity stamps",
    url: "https://signedinbox.com",
    siteName: "SignedInbox",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
