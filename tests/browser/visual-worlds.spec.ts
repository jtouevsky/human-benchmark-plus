import { test, expect } from "@playwright/test";
test("chrome renders, reacts to pointer and scrolling, and stops during a test", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator(".metal-canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  await page
    .getByRole("button", { name: "Pause sculpture", exact: true })
    .click();
  await page.waitForTimeout(600);
  const before = await canvas.screenshot();
  const rect = await canvas.boundingBox();
  await page.mouse.move(
    rect!.x + rect!.width * 0.8,
    rect!.y + rect!.height * 0.4,
  );
  await page.waitForTimeout(400);
  await expect(canvas).toHaveAttribute("data-interaction", "pointer");
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-scroll")))
    .toBeGreaterThan(0.1);
  await page
    .getByRole("button", { name: "Resume sculpture", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start a test", exact: false })
    .click();
  await expect(page.locator(".test-intro")).toHaveCSS("opacity", "1");
  const phase = await canvas.getAttribute("data-phase");
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute("data-phase")).toBe(phase);
  await page
    .getByRole("button", { name: "Begin experiment", exact: true })
    .click();
  await expect(page.locator(".test-overlay")).toHaveAttribute(
    "data-active",
    "true",
  );
});
test("3D atlas shows actual scores, supports inspection and replays without changing data", async ({
  page,
}) => {
  const record = {
    id: "visual-fixture",
    testType: "reaction",
    timestamp: 1700000000000,
    difficulty: 1,
    rawScore: 240,
    accuracy: 1,
    responseTime: 245,
    normalizedScore: 65,
    percentile: 65,
    protocolVersion: 2,
    metadata: { trials: [230, 235, 240, 240, 250, 260, 270] },
  };
  await page.goto("/");
  await page.evaluate(
    (r) => localStorage.setItem("hb-results-v1", JSON.stringify([r])),
    record,
  );
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  const stage = page.locator(".profile-world .scene-stage");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-rendered", "true");
  await page
    .getByRole("button", { name: "Pause rotation", exact: true })
    .click();
  await page.waitForTimeout(500);
  const rotation = await stage.getAttribute("data-rotation");
  await stage.locator("canvas").press("ArrowRight");
  await expect
    .poll(() => stage.getAttribute("data-rotation"))
    .not.toBe(rotation);
  await page
    .locator(".scene-label")
    .filter({ hasText: "Reaction time" })
    .click();
  await expect(page.locator(".scene-readout")).toContainText("240 ms");
  await expect(page.locator(".scene-readout")).not.toContainText("percentile");
  await page.getByRole("slider", { name: "Explore profile history" }).fill("0");
  await expect(
    page.getByRole("region", { name: "Standalone test performance" }),
  ).toContainText("0 observations");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hb-results-v1")!),
    ),
  ).toEqual([record]);
  await page.getByText("Advanced analysis", { exact: false }).first().click();
  await expect(page.locator(".measurement-profile")).toBeVisible();
});
test("worlds have distinct palettes and mobile layouts stay within the viewport", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(async () => (await page.locator(".chrome-title").boundingBox())!.x)
    .toBeGreaterThanOrEqual(0);
  const colors: string[] = [];
  for (const view of ["Home", "Tests", "Profile", "History", "Lab"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(page.locator("main")).toHaveClass(
      new RegExp(`environment-${view.toLowerCase()}`),
    );
    colors.push(
      await page
        .locator("main")
        .evaluate((el) => getComputedStyle(el).background),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  }
  expect(new Set(colors).size).toBe(5);
});
test("reduced motion keeps the sculpture still and disables cinematic wipes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const canvas = page.locator(".metal-canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  const phase = await canvas.getAttribute("data-phase");
  await page.waitForTimeout(300);
  expect(await canvas.getAttribute("data-phase")).toBe(phase);
  await expect(page.locator(".scene-transition")).toHaveCSS("display", "none");
  await page
    .getByRole("button", { name: "Start a test", exact: false })
    .click();
  await expect(page.locator(".test-intro")).toHaveCSS("opacity", "1");
});
