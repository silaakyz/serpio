/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@serpio/ui", "@serpio/database", "@serpio/types"]
};

module.exports = nextConfig;
