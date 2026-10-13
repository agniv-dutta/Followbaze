/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Keep E2E/dev output separate from a production `.next` build so the two
  // never collide (e.g. running `npm run e2e` right after `npm run build`).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Allows the E2E/dev server to be reached via 127.0.0.1 without dev warnings.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
