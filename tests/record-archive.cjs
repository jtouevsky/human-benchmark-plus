require("../scripts/register-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { appendRecord } = require("../lib/record-archive.ts");
test("append preserves historical and unknown records and latest writes from other tabs", () => {
  const legacy = { id: "legacy", rawScore: 240 },
    future = { id: "future", schema: 99, opaque: { keep: true } },
    otherTab = { id: "other-tab", rawScore: 310 },
    fresh = { id: "new", rawScore: 270 };
  assert.deepEqual(
    appendRecord(JSON.stringify([legacy, future, otherTab]), fresh),
    [legacy, future, otherTab, fresh],
  );
});
test("append is idempotent and refuses malformed archives", () => {
  const r = { id: "new", score: 4 };
  assert.deepEqual(appendRecord(null, r), [r]);
  assert.deepEqual(appendRecord(JSON.stringify([r]), r), [r]);
  for (const raw of ["not-json", "null", "{}"])
    assert.throws(() => appendRecord(raw, r));
});
