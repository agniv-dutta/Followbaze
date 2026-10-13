/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Allows the E2E/dev server to be reached via 127.0.0.1 without dev warnings.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
