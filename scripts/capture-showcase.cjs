// Capture real UI and real submitted responses in an isolated browser profile.
// Requires a running production export, Chrome, Playwright FFmpeg, and full FFmpeg.
require("./register-typescript.cjs");
const { chromium } = require("playwright");
const { createSpatialTask } = require("../lib/tasks/spatial.ts");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
(async () => {
  const output = path.resolve(process.env.CAPTURE_DIR || "artifacts/showcase");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.CAPTURE_BROWSER || "chrome",
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: output, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const origin = Date.now(),
    clips = [];
  async function clip(name, seconds, action) {
    const start = (Date.now() - origin) / 1000;
    if (action) await action();
    await page.waitForTimeout(
      Math.max(0, seconds * 1000 - (Date.now() - origin - start * 1000)),
    );
    clips.push({ name, start, duration: seconds });
    await page.screenshot({ path: path.join(output, `${name}.png`) });
  }
  await page.goto(process.env.HB_TEST_URL || "http://127.0.0.1:3011");
  await page.locator('main[aria-busy="false"]').waitFor();
  await page.locator('.metal-canvas[data-rendered="true"]').first().waitFor();
  await page.waitForTimeout(1500);
  await clip("home", 4, async () => {
    await page.mouse.move(1050, 420);
    await page.mouse.down();
    await page.mouse.move(1220, 520, { steps: 40 });
    await page.mouse.up();
  });
  await page.getByRole("button", { name: "Tests", exact: true }).click();
  await page.waitForTimeout(900);
  await clip("tests", 2);
  await page.locator(".library-spatial").click();
  await page
    .getByRole("button", { name: "Begin experiment", exact: true })
    .click();
  await page.locator("[data-task-id]").waitFor();
  await clip("spatial", 4, async () => {
    await page.getByRole("button", { name: /Change viewing angle/ }).click();
  });
  for (let i = 0; i < 10; i++) {
    const id = await page
      .locator("[data-task-id]")
      .getAttribute("data-task-id");
    const parts = id.split("-");
    const q = createSpatialTask(Number(parts[2]), Number(parts[3])).question;
    await page
      .getByRole("button", {
        name: `Option ${1 + (i === 2 ? (q.correct + 1) % q.options.length : q.correct)}`,
        exact: true,
      })
      .click();
    await page.locator(".evidence-feedback").waitFor();
    if (i === 0) await clip("evidence", 2);
    await page
      .getByRole("button", {
        name: i === 9 ? /Finish & inspect results/ : /Next selected shape/,
      })
      .click();
  }
  await page
    .getByRole("dialog", { name: "Experiment results", exact: true })
    .waitFor();
  await page.waitForTimeout(800);
  await clip("result", 3);
  // The completed session and its ten observations were saved by normal UI actions.
  const counts = await page.evaluate(() => ({
    results: JSON.parse(localStorage.getItem("hb-results-v1")).length,
    trials: JSON.parse(localStorage.getItem("hb-measurement-spatial-v1"))
      .length,
  }));
  if (counts.results !== 1 || counts.trials !== 10)
    throw Error("Capture did not persist its real results");
  await page
    .getByRole("button", { name: "Close results", exact: true })
    .click();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.locator('.scene-stage[data-rendered="true"]').waitFor();
  await page.locator(".scene-stage").scrollIntoViewIfNeeded();
  await clip("profile", 4, async () => {
    const b = await page.locator(".scene-stage").boundingBox();
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.6, {
      steps: 45,
    });
    await page.mouse.up();
  });
  await page.locator(".advanced-analysis > summary").click();
  await page.locator(".posterior-view").scrollIntoViewIfNeeded();
  const posterior = page.locator('[aria-label^="3D posterior density"]');
  await posterior.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await clip("posterior", 4, async () => {
    const b = await posterior.boundingBox();
    await page.mouse.move(b.x + b.width * 0.45, b.y + b.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.65, b.y + b.height * 0.55, {
      steps: 40,
    });
    await page.mouse.up();
  });
  await page.getByRole("button", { name: "Lab", exact: true }).click();
  await page.waitForTimeout(900);
  await clip("lab", 3);
  const video = page.video();
  await context.close();
  const raw = await video.path();
  await browser.close();
  fs.writeFileSync(
    path.join(output, "capture.json"),
    JSON.stringify({ viewport: [1440, 900], clips, counts, errors }, null, 2),
  );
  if (errors.length) throw Error(errors.join("\n"));
  const ffmpeg = process.env.FFMPEG || "ffmpeg";
  const run = (args) => {
    const r = spawnSync(ffmpeg, args, { stdio: "inherit" });
    if (r.error || r.status)
      throw r.error || Error(`FFmpeg exited ${r.status}`);
  };
  const filter =
    clips
      .map(
        (c, i) =>
          `[0:v]trim=start=${c.start}:duration=${c.duration},setpts=PTS-STARTPTS[v${i}]`,
      )
      .join(";") +
    ";" +
    clips.map((_, i) => `[v${i}]`).join("") +
    `concat=n=${clips.length}:v=1:a=0,fps=24,format=yuv420p[out]`;
  // Refuse overwrites: use a new CAPTURE_DIR for each capture.
  run([
    "-n",
    "-i",
    raw,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-preset",
    "medium",
    "-movflags",
    "+faststart",
    path.join(output, "walkthrough.mp4"),
  ]);
  run([
    "-n",
    "-i",
    path.join(output, "walkthrough.mp4"),
    "-filter_complex",
    "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",
    "-loop",
    "0",
    path.join(output, "preview.gif"),
  ]);
  console.log(`Review media in ${output} before copying into docs/assets.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
