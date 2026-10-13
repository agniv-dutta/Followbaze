import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Playwright transpiles this config to CommonJS, so `__dirname` is available.
const here = __dirname;
const backendDir = path.resolve(here, "..", "backend");
const pythonBin =
  process.platform === "win32"
    ? path.join(backendDir, ".venv", "Scripts", "python.exe")
    : path.join(backendDir, ".venv", "bin", "python");

const FRONTEND_PORT = 3100;
const BACKEND_PORT = 8010;
const API_URL = `http://127.0.0.1:${BACKEND_PORT}`;

/**
 * E2E runs against a real backend (isolated e2e.db) and a real frontend dev
 * server — the backend is not mocked. Both servers are started automatically.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `"${pythonBin}" -m scripts.serve_e2e`,
      cwd: backendDir,
      url: `${API_URL}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: "sqlite:///./e2e.db",
        AUTO_CREATE_TABLES: "true",
        E2E_BACKEND_PORT: String(BACKEND_PORT),
        CORS_ORIGINS: `http://127.0.0.1:${FRONTEND_PORT},http://localhost:${FRONTEND_PORT}`,
      },
    },
    {
      command: `npm run dev -- -p ${FRONTEND_PORT}`,
      cwd: here,
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: API_URL,
        NEXT_PUBLIC_APP_TIMEZONE: "Asia/Kolkata",
      },
    },
  ],
});
