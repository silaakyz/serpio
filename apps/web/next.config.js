/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@serpio/ui", "@serpio/database", "@serpio/types"],

  // Production optimizasyonları
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Docker/Railway için standalone output — sadece STANDALONE=true env ile aktif
  output: process.env.STANDALONE === "true" ? "standalone" : undefined,

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  experimental: {
    optimizePackageImports: ["@serpio/ui"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",       value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
