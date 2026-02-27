import type { NextConfig } from "next";

// Pin frame-ancestors to the specific extension ID when configured.
// Use NEXT_PUBLIC_EXTENSION_ID=your_32_char_id in production.
// Falls back to the wildcard chrome-extension://* for local dev.
const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID;
const frameAncestors = extensionId
  ? `'self' chrome-extension://${extensionId}`
  : "'self' chrome-extension://*";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow only the signedinbox Chrome extension to embed this page in an offscreen iframe.
        // Set NEXT_PUBLIC_EXTENSION_ID to your extension's 32-character ID to restrict to a single extension.
        source: "/turnstile-frame",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
