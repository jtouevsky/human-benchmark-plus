import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 120000,
  expect: { timeout: 10000 },
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.HB_TEST_URL || "http://127.0.0.1:3010",
    channel: process.env.CI ? undefined : "chrome",
    // CI runners have no physical GPU; use a reproducible software renderer.
    launchOptions: process.env.CI
      ? { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }
      : undefined,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: process.env.HB_TEST_URL
    ? undefined
    : {
        command: "npm run dev -- --port 3010",
        url: "http://127.0.0.1:3010",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
