import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";
let apiHostName: string | null = null;

try {
  if (apiBaseUrl) {
    apiHostName = new URL(apiBaseUrl).hostname;
  }
} catch {
  apiHostName = null;
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60,
    remotePatterns: apiHostName
      ? [
          {
            protocol: "https",
            hostname: apiHostName,
            pathname: "/uploads/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
