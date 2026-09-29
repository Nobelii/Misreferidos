import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra un build de producción: es lo que se despliega, y el dev server
 * no reproduce PPR ni los status reales (el 404 de /marca/[slug], p. ej.).
 *
 * Usa el Supabase de .env.local (en CI, los secrets del repo). Los tests son
 * de solo lectura: no crean usuarios ni datos.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
