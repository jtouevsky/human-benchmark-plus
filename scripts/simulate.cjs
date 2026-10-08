require("./register-typescript.cjs");
const { simulate } = require("../lib/measurement/simulate.ts");
const cases = [-2, -1, 0, 1, 2].flatMap((theta) =>
  Array.from({ length: 8 }, (_, i) =>
    simulate(theta, 100 + i * 191 + Math.round((theta + 2) * 1000)),
  ),
);
const mae = cases.reduce((s, x) => s + Math.abs(x.error), 0) / cases.length;
const coverage =
  cases.filter(
    (x) => x.interval[0] <= x.trueTheta && x.interval[1] >= x.trueTheta,
  ).length / cases.length;
console.table(
  [-2, -1, 0, 1, 2].map((theta) => {
    const a = cases.filter((x) => x.trueTheta === theta);
    return {
      trueTheta: theta,
      meanEstimate: (a.reduce((s, x) => s + x.mean, 0) / a.length).toFixed(3),
      meanAbsoluteError: (
        a.reduce((s, x) => s + Math.abs(x.error), 0) / a.length
      ).toFixed(3),
      meanSD: (a.reduce((s, x) => s + x.sd, 0) / a.length).toFixed(3),
    };
  }),
);
console.log(
  JSON.stringify(
    {
      users: cases.length,
      trialsPerUser: 120,
      meanAbsoluteError: mae,
      credibleIntervalCoverage: coverage,
      model: "Synthetic response model; not human validation",
    },
    null,
    2,
  ),
);
if (mae > 0.45) process.exitCode = 1;
