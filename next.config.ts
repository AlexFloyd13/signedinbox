import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow Chrome extensions to embed this page in an offscreen iframe
        source: "/turnstile-frame",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' chrome-extension://*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
