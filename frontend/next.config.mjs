/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Keep dev/E2E output separate from a production `.next` build so the two
  // never collide (e.g. running `npm run dev` or `npm run e2e` right after
  // `npm run build`, which 404s the dev server's own `/_next/static` assets).
  // `NEXT_DIST_DIR` wins when set (Playwright uses `.next-e2e`).
  distDir:
    process.env.NEXT_DIST_DIR ||
    (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
  // Allows the E2E/dev server to be reached via 127.0.0.1 without dev warnings.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
