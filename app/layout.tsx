import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
