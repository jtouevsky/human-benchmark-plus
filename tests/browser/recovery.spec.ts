import { test, expect, Page } from "@playwright/test";
import { createSpatialTask } from "../../lib/tasks/spatial";
const names = {
  reaction: "Reaction time",
  memory: "Visual memory",
  math: "Mental math",
  spatial: "Spatial reasoning",
};
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
});
async function openCore(page: Page, type: keyof typeof names) {
  await page.getByRole("button", { name: "Tests", exact: true }).click();
  await page.locator(`.library-${type}`).click();
  const dialog = page.getByRole("dialog", { name: names[type], exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".test-intro")).toHaveCSS("opacity", "1");
  await dialog
    .getByRole("button", { name: "Begin experiment", exact: true })
    .click();
}
async function runMath(page: Page) {
  for (let i = 0; i < 10; i++) {
    const text = await page.locator(".equation").innerText();
    let answer: number;
    let m = text.match(/^([\d.]+)% of \? = ([\d.]+)$/);
    if (m) answer = (Number(m[2]) * 100) / Number(m[1]);
    else if ((m = text.match(/^([\d.]+)% of ([\d.]+)$/)))
      answer = (Number(m[1]) * Number(m[2])) / 100;
    else {
      const expression = text
        .replace(" ≈ ?", "")
        .replaceAll("×", "*")
        .replaceAll("÷", "/")
        .replaceAll("−", "-")
        .replace(" of ", "*");
      if (!/^[\d\s()+*/.-]+$/.test(expression))
        throw Error(`Unknown equation ${text}`);
      answer = Function(`return (${expression})`)();
      if (text.includes("≈")) answer = Math.round(answer / 100) * 100;
      else if (
        (await page.locator("label[for=answer]").innerText()).includes(
          "2 decimal",
        )
      )
        answer = Math.round(answer * 100) / 100;
    }
    await page.locator("#answer").fill(String(i === 2 ? answer + 99 : answer));
    await page.locator("#answer").press("Enter");
    await expect(page.locator(".math-experiment [role=status]")).toContainText(
      i === 2 ? "Answer:" : "Correct.",
    );
    await page
      .getByRole("button", {
        name: i === 9 ? "See results" : "Next question",
        exact: true,
      })
      .click();
  }
}
async function runMemory(page: Page) {
  let totalCells = 0,
    capacity = 0;
  for (let i = 0; i < 8; i++) {
    await expect(page.locator(".memory-experiment h1")).toHaveText(
      "Capture the pattern.",
    );
    const indices = await page
      .locator(".memory-grid button")
      .evaluateAll((bs) =>
        bs.flatMap((b, i) => (b.classList.contains("lit") ? [i] : [])),
      );
    expect(indices.length).toBeGreaterThan(0);
    totalCells += indices.length;
    if (i !== 2) capacity = Math.max(capacity, indices.length);
    await expect(page.locator(".memory-experiment h1")).toHaveText(
      "Reconstruct the signal.",
    );
    if (i === 2) {
      const count = await page.locator(".memory-grid button").count();
      indices[0] = Array.from({ length: count }, (_, n) => n).find(
        (n) => !indices.includes(n),
      )!;
    }
    for (const idx of indices)
      await page.locator(".memory-grid button").nth(idx).press("Space");
    await page
      .getByRole("button", { name: "Confirm pattern", exact: true })
      .click();
    await expect(page.locator(".memory-experiment h1")).toHaveText(
      i === 2 ? "A new point of reference." : "Pattern recovered.",
    );
    await page
      .getByRole("button", {
        name: i === 7 ? "See results" : "Next pattern",
        exact: true,
      })
      .click();
  }
  const result = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hb-results-v1") || "[]").at(-1),
  );
  expect(result.rawScore).toBe(capacity);
  expect(result.accuracy).toBeCloseTo((totalCells - 1) / totalCells);
  expect(result.metadata.incorrectCells).toBe(1);
}
async function runReaction(page: Page) {
  const field = page.locator(".reaction-field");
  await field.press("Space");
  await field.press("Space");
  await expect(field).toHaveClass(/early/);
  for (let i = 0; i < 7; i++) {
    await field.press("Space");
    await expect(field).toHaveClass(/go/, { timeout: 8000 });
    await page.waitForTimeout(130);
    if (i % 2) await field.click();
    else await field.press("Space");
    await expect(field).toHaveClass(/trial/);
  }
  await field.click();
}
async function runSpatial(page: Page) {
  for (let i = 0; i < 10; i++) {
    const id = await page
      .locator("[data-task-id]")
      .getAttribute("data-task-id");
    const parts = id!.split("-"),
      q = createSpatialTask(Number(parts[2]), Number(parts[3])).question;
    await page
      .getByRole("button", {
        name: `Option ${1 + (i === 2 ? (q.correct + 1) % q.options.length : q.correct)}`,
        exact: true,
      })
      .click();
    await expect(page.locator(".evidence-feedback")).toBeVisible();
    await page
      .getByRole("button", {
        name: i === 9 ? "Finish & inspect results" : "Next selected shape",
        exact: false,
      })
      .click();
  }
}
const runners = {
  reaction: runReaction,
  memory: runMemory,
  math: runMath,
  spatial: runSpatial,
};
for (const type of Object.keys(names) as (keyof typeof names)[])
  test(`${type}: initialize, answer, finish, persist, retry, navigate`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openCore(page, type);
    await runners[type](page);
    await expect(
      page.getByRole("dialog", { name: "Experiment results", exact: true }),
    ).toBeVisible();
    const records = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hb-results-v1") || "[]"),
    );
    expect(records).toHaveLength(1);
    expect(records[0].testType).toBe(type);
    expect(Number.isFinite(records[0].rawScore)).toBe(true);
    if (type === "math") expect(records[0].accuracy).toBe(0.9);
    if (type === "spatial") {
      expect(records[0].accuracy).toBe(0.9);
      expect(
        await page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("hb-measurement-spatial-v1") || "[]",
            ).length,
        ),
      ).toBe(10);
    }
    if (type === "reaction") {
      expect(records[0].metadata.falseStarts).toBe(1);
      expect(records[0].metadata.trials).toHaveLength(7);
      const times = [...records[0].metadata.trials].sort((a, b) => a - b);
      expect(records[0].rawScore).toBe(times[3]);
    }
    await page
      .getByRole("button", {
        name: type === "spatial" ? "Another spatial session" : "Repeat",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Begin experiment", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".test-intro")).toHaveCSS("opacity", "1");
    await page.getByRole("button", { name: "Exit test", exact: true }).click();
    await expect(page.locator(".test-overlay")).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page.locator(".history-row")).toContainText(names[type]);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("hb-results-v1") || "[]").length,
      ),
    ).toBe(1);
    expect(errors).toEqual([]);
  });
const labNames = {
  time: "Time perception",
  search: "Visual search",
  change: "Change blindness",
  probability: "Probability intuition",
  randomness: "Randomness detection",
  tracking: "Multi-object tracking",
};
for (const type of Object.keys(labNames) as (keyof typeof labNames)[])
  test(`Lab ${type}: complete five rounds, save, retry and return`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.getByRole("button", { name: "Lab", exact: true }).click();
    await page.locator(`.lab-card.lab-${type}`).click();
    const dialog = page.getByRole("dialog", {
      name: labNames[type],
      exact: true,
    });
    await expect(dialog.locator(".lab-intro p")).not.toBeEmpty();
    await dialog.getByRole("button", { name: "Begin exploration" }).click();
    const expected: number[] = [];
    for (let i = 0; i < 5; i++) {
      await expect(dialog.locator(".lab-round-label")).toContainText(
        `ROUND ${i + 1} / 5`,
      );
      if (type === "time") {
        await dialog
          .getByRole("button", { name: "Start interval" })
          .press("Space");
        await page.waitForTimeout(180);
        await dialog
          .getByRole("button", { name: "Stop interval" })
          .press("Space");
        await expect(dialog.getByRole("status")).toContainText("You estimated");
      } else if (type === "search") {
        const paths = await dialog
          .locator(".search-field path")
          .evaluateAll((es) =>
            es.map((e) => ({
              d: e.getAttribute("d"),
              t: e.getAttribute("transform"),
            })),
          );
        const target = paths.findIndex(
          (x) => x.d === "M10 10 H30 M20 10 V30" && x.t === "rotate(0 20 20)",
        );
        expect(target).toBeGreaterThanOrEqual(0);
        if (i === 0)
          await dialog
            .getByRole("button", {
              name: `Tile ${((target + 1) % paths.length) + 1}`,
              exact: true,
            })
            .click();
        await dialog
          .getByRole("button", { name: `Tile ${target + 1}`, exact: true })
          .press("Space");
        await expect(dialog.getByRole("status")).toContainText("Target found");
      } else if (type === "change") {
        await expect(dialog.locator(".grid-study>p").first()).toHaveText(
          "Study the orientations.",
        );
        const original = await dialog
          .locator(".search-field path")
          .evaluateAll((es) => es.map((e) => e.getAttribute("transform")));
        await expect(
          dialog.getByRole("button", { name: "Tile 1", exact: true }),
        ).toBeEnabled();
        const after = await dialog
          .locator(".search-field path")
          .evaluateAll((es) => es.map((e) => e.getAttribute("transform")));
        const target = after.findIndex((a, j) => a !== original[j]);
        expect(target).toBeGreaterThanOrEqual(0);
        await dialog
          .getByRole("button", {
            name: `Tile ${(i === 2 ? (target + 1) % after.length : target) + 1}`,
            exact: true,
          })
          .click();
        expected.push(i === 2 ? 0 : 100);
      } else if (type === "tracking") {
        await expect(dialog.locator(".tracking-study>p")).toContainText(
          "Memorize",
        );
        const targets = await dialog
          .locator(".tracking-field button")
          .evaluateAll((es) =>
            es.flatMap((e, j) => (e.classList.contains("target") ? [j] : [])),
          );
        await expect(
          dialog.locator(".tracking-field button").first(),
        ).toBeEnabled({ timeout: 15000 });
        for (const idx of targets)
          await dialog
            .getByRole("button", { name: `Object ${idx + 1}`, exact: true })
            .press("Space");
        await dialog.getByRole("button", { name: "Check targets" }).click();
        expected.push(100);
      } else {
        const options = await dialog
          .locator(".lab-choices b")
          .allTextContents();
        let correct: number;
        if (type === "probability") {
          const values = options.map((s) => {
            const ns = s.match(/[\d.]+/g)!.map(Number);
            return s.startsWith("Guaranteed") ? ns[0] : (ns[0] * ns[1]) / 100;
          });
          correct = values[0] > values[1] ? 0 : 1;
        } else {
          const repeated = (s: string) => {
            const a = s.split(" ");
            return Array.from({ length: 8 }, (_, j) => j + 1).some((n) =>
              a.every((v, k) => v === a[k % n]),
            );
          };
          correct = repeated(options[0]) ? 1 : 0;
        }
        await dialog
          .locator(".lab-choices button")
          .nth(i === 2 ? 1 - correct : correct)
          .press("Space");
        await expect(dialog.getByRole("status")).toContainText(
          i === 2 ? "A useful surprise." : "Correct.",
        );
        expected.push(i === 2 ? 0 : 100);
      }
      await dialog
        .getByRole("button", { name: "Continue", exact: true })
        .click();
    }
    await expect(dialog.locator(".lab-summary")).toBeVisible();
    let records = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hb-lab-v1") || "[]"),
    );
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record.type).toBe(type);
    expect(record.values).toHaveLength(5);
    expect(record.score).toBeCloseTo(
      record.values.reduce((a: number, b: number) => a + b, 0) / 5,
      8,
    );
    if (expected.length) expect(record.values).toEqual(expected);
    if (type === "search") expect(record.errors).toBe(1);
    await dialog.getByRole("button", { name: "Explore again" }).click();
    await dialog.getByRole("button", { name: "Begin exploration" }).click();
    await expect(dialog.locator(".lab-round-label")).toContainText(
      "ROUND 1 / 5",
    );
    await dialog.getByRole("button", { name: "Exit Lab" }).click();
    await expect(page.locator(".test-overlay")).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: "Lab", exact: true }).click();
    await expect(page.locator(".lab-log")).toContainText(labNames[type]);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("hb-lab-v1") || "[]").length,
      ),
    ).toBe(1);
    expect(errors).toEqual([]);
  });
test("full mixed-protocol session supports save/resume, completion and archived report", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.getByRole("button", { name: "Run a full session" }).click();
  await page
    .getByRole("button", { name: "Begin session", exact: true })
    .click();
  for (const [i, type] of (
    ["reaction", "memory", "math", "spatial"] as const
  ).entries()) {
    await page
      .getByRole("button", { name: "Begin experiment", exact: true })
      .click();
    await runners[type](page);
    await expect(
      page.getByRole("dialog", { name: "Experiment results", exact: true }),
    ).toBeVisible();
    if (i === 0) {
      await page
        .getByRole("button", { name: "Save & exit", exact: true })
        .click();
      await page.reload();
      await page
        .getByRole("button", { name: "Resume session", exact: false })
        .click();
    } else
      await page
        .getByRole("button", {
          name: i === 3 ? "Session report" : "Continue session",
          exact: true,
        })
        .click();
  }
  await expect(
    page.getByRole("dialog", { name: "Cognitive session summary" }),
  ).toBeVisible();
  const r = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hb-results-v1") || "[]"),
  );
  expect(r).toHaveLength(4);
  expect(new Set(r.map((x: any) => x.sessionId)).size).toBe(1);
  expect(r.map((x: any) => x.protocolVersion)).toEqual([2, 2, 2, 4]);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hb-session-v2") || "null"),
    ),
  ).toBeNull();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page
    .getByRole("button", { name: "View summary", exact: false })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cognitive session summary" }),
  ).toBeVisible();
});
test("existing non-spatial history is visible in Profile without becoming Bayesian evidence", async ({
  page,
}) => {
  const record = {
    id: "historical-reaction",
    testType: "reaction",
    timestamp: 1700000000000,
    difficulty: 1,
    rawScore: 250,
    accuracy: 1,
    responseTime: 260,
    normalizedScore: 65,
    percentile: 65,
    protocolVersion: 2,
    metadata: { trials: [230, 240, 250, 250, 260, 270, 280] },
  };
  await page.evaluate(
    (r) => localStorage.setItem("hb-results-v1", JSON.stringify([r])),
    record,
  );
  await page.reload();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Standalone test performance" }),
  ).toContainText("1 observation");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("hb-measurement-spatial-v1"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hb-results-v1")!),
    ),
  ).toEqual([record]);
});

// Playwright's visibility check alone accepts opacity:0. Check the painted
// instructions so an invisible, but technically clickable, intro cannot pass.
for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Home and library instructions are painted at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    for (const type of Object.keys(names) as (keyof typeof names)[]) {
      await page.getByRole("button", { name: "Tests", exact: true }).click();
      await page.locator(`.library-${type}`).click();
      await expect(page.locator(".test-intro")).toHaveCSS("opacity", "1");
      await expect(page.locator(".test-intro h1")).toBeInViewport();
      await page
        .getByRole("button", { name: "Exit test", exact: true })
        .click();
      await expect(page.locator(".test-overlay")).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Home", exact: true }).click();
    const card = page.locator(".instrument-reaction");
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page.locator(".test-intro")).toHaveCSS("opacity", "1");
    await expect(page.locator(".test-intro h1")).toBeInViewport();
    await page
      .getByRole("button", { name: "Begin experiment", exact: true })
      .click();
    await expect(page.locator(".reaction-field")).toBeInViewport();
  });
}
for (const raw of [
  '[{"id":"newer-other-tab","unknownVersion":true}]',
  "{unreadable",
]) {
  test(`finishing preserves the latest archive: ${raw}`, async ({ page }) => {
    await openCore(page, "math");
    // Model a write from another tab after this page loaded its cached history.
    await page.evaluate(
      (value) => localStorage.setItem("hb-results-v1", value),
      raw,
    );
    await runMath(page);
    await expect(
      page.getByRole("dialog", { name: "Experiment results", exact: true }),
    ).toBeVisible();
    const saved = await page.evaluate(() =>
      localStorage.getItem("hb-results-v1"),
    );
    if (raw.startsWith("[")) {
      const records = JSON.parse(saved!);
      expect(records).toHaveLength(2);
      expect(records[0]).toEqual(JSON.parse(raw)[0]);
      expect(records[1].testType).toBe("math");
    } else {
      expect(saved).toBe(raw);
      await expect(page.locator(".storage-error")).toBeVisible();
    }
  });
}
