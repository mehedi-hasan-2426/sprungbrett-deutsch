import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";

const port = 3107;
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname localhost --port ${port}`,
    url: `http://localhost:${port}/signin`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXTAUTH_URL: `http://localhost:${port}`,
      NEXTAUTH_SECRET: randomBytes(32).toString("base64url"),
      GOOGLE_CLIENT_ID: "synthetic-client",
      GOOGLE_CLIENT_SECRET: "synthetic-only",
      ALLOWED_EMAILS: "first@example.com",
      DATABASE_URL: "",
    },
  },
});
