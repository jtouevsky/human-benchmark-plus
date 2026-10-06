"use client";
import { useId, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { profile, TestResult } from "@/lib/model";
export default function Radar({
  results,
  large = false,
}: {
  results: TestResult[];
  large?: boolean;
}) {
  const uid = useId().replace(/:/g, ""),
    [selected, setSelected] = useState<number | null>(null);
  const x = useMotionValue(0),
    y = useMotionValue(0),
    rx = useSpring(x, { stiffness: 130, damping: 25 }),
    ry = useSpring(y, { stiffness: 130, damping: 25 }),
    reduced = useReducedMotion();
  const d = profile(results),
    c = 310,
    r = 170;
  const pt = (i: number, radius: number, offset = 0) => [
    (c + Math.sin((i * Math.PI) / 3) * radius).toFixed(3),
    (c - Math.cos((i * Math.PI) / 3) * radius + offset).toFixed(3),
  ];
  const vertices = (offset = 0, band = 0) =>
    d
      .map((v, i) =>
        pt(
          i,
          v.count
            ? (r * Math.min(100, Math.max(0, v.value + band * v.band))) / 100
            : 28,
          offset,
        ).join(","),
      )
      .join(" ");
  return (
    <div className={"radar-container " + (large ? "large" : "")}>
      <motion.div
        className="radar"
        onPointerMove={(e) => {
          if (reduced || e.pointerType !== "mouse") return;
          const b = e.currentTarget.getBoundingClientRect();
          x.set(((e.clientY - b.top - b.height / 2) / b.height) * -10);
          y.set(((e.clientX - b.left - b.width / 2) / b.width) * 10);
        }}
        onPointerLeave={() => {
          x.set(0);
          y.set(0);
        }}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      >
        <svg
          viewBox="0 0 620 620"
          role="img"
          aria-label="Interactive cognitive profile. Select a dimension to inspect its confidence."
        >
          <defs>
            <radialGradient id={uid + "a"}>
              <stop stopColor="#acc8ef" stopOpacity=".13" />
              <stop offset=".65" stopColor="#608bd0" stopOpacity=".03" />
              <stop offset="1" stopColor="#608bd0" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={uid + "s"} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#e0eeff" stopOpacity=".38" />
              <stop offset=".5" stopColor="#86bbec" stopOpacity=".09" />
              <stop offset="1" stopColor="#bbb6e7" stopOpacity=".28" />
            </linearGradient>
            <linearGradient id={uid + "f"}>
              <stop stopColor="#b9d7f8" stopOpacity=".04" />
              <stop offset="1" stopColor="#b9d7f8" stopOpacity=".18" />
            </linearGradient>
          </defs>
          <circle cx={c} cy={c} r="290" fill={`url(#${uid}a)`} />
          <g className="radar-ticks">
            {Array.from({ length: 72 }, (_, i) => {
              const a = (i * Math.PI) / 36;
              return (
                <line
                  key={i}
                  x1={(c + Math.sin(a) * (i % 6 ? 213 : 209)).toFixed(3)}
                  y1={(c - Math.cos(a) * (i % 6 ? 213 : 209)).toFixed(3)}
                  x2={(c + Math.sin(a) * 217).toFixed(3)}
                  y2={(c - Math.cos(a) * 217).toFixed(3)}
                  stroke={i % 6 ? "#354251" : "#7c8c9e"}
                  strokeWidth={i % 6 ? 1 : 1.5}
                />
              );
            })}
          </g>
          <circle
            cx={c}
            cy={c}
            r="197"
            fill="none"
            stroke="#718299"
            strokeOpacity=".15"
          />
          <g className="scan-ring">
            <circle
              cx={c}
              cy={c}
              r="225"
              fill="none"
              stroke="#b5d6f1"
              strokeOpacity=".25"
              strokeDasharray="40 650"
            />
          </g>
          {[0.25, 0.5, 0.75, 1].map((n) => (
            <polygon
              key={n}
              points={d.map((_, i) => pt(i, r * n).join(",")).join(" ")}
              fill="none"
              stroke="#91a6bd"
              strokeOpacity=".12"
            />
          ))}
          {d.map((v, i) => (
            <line
              key={v.name}
              x1={c}
              y1={c}
              x2={pt(i, 195)[0]}
              y2={pt(i, 195)[1]}
              stroke="#8f9eb3"
              strokeOpacity=".16"
            />
          ))}
          <motion.polygon
            initial={false}
            animate={{ points: vertices(23) }}
            transition={{ type: "spring", stiffness: 70, damping: 22 }}
            fill="#a3c3e9"
            fillOpacity=".035"
            stroke="#a3c3e9"
            strokeOpacity=".15"
          />
          {d.map((v, i) => (
            <motion.polygon
              initial={false}
              key={"facet" + i}
              animate={{
                points: [
                  pt(i, v.count ? (r * v.value) / 100 : 28),
                  pt(
                    (i + 1) % 6,
                    d[(i + 1) % 6].count
                      ? (r * d[(i + 1) % 6].value) / 100
                      : 28,
                  ),
                  pt(
                    (i + 1) % 6,
                    d[(i + 1) % 6].count
                      ? (r * d[(i + 1) % 6].value) / 100
                      : 28,
                    23,
                  ),
                  pt(i, v.count ? (r * v.value) / 100 : 28, 23),
                ]
                  .map((p) => p.join(","))
                  .join(" "),
              }}
              fill={`url(#${uid}f)`}
              stroke="#a3c3e9"
              strokeOpacity=".08"
            />
          ))}
          <motion.polygon
            initial={false}
            animate={{ points: vertices(0, 1) }}
            transition={{ type: "spring", stiffness: 70, damping: 22 }}
            fill="#acc9ef"
            fillOpacity=".035"
            stroke="#bfd9f1"
            strokeOpacity=".3"
            strokeDasharray="2 6"
          />
          <motion.polygon
            initial={false}
            animate={{ points: vertices() }}
            transition={{ type: "spring", stiffness: 70, damping: 22 }}
            fill={`url(#${uid}s)`}
            stroke="#c1dcf7"
            strokeWidth="1.25"
            strokeOpacity={results.length ? 0.85 : 0.25}
          />
          {d.map((v, i) => {
            const p = pt(i, v.count ? (r * v.value) / 100 : 28),
              label = pt(i, 265);
            return (
              <g key={v.name}>
                <line
                  x1={c}
                  y1={c}
                  x2={p[0]}
                  y2={p[1]}
                  stroke="#daeaff"
                  strokeOpacity={selected === i ? 0.8 : 0.12}
                />
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r={selected === i ? 6 : 3}
                  fill="#d8ecff"
                  opacity={v.count ? 1 : 0.3}
                />
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${v.name}: ${v.count ? Math.round(v.value) + " estimated percentile, " + v.confidence + " confidence" : "unmeasured"}`}
                  onClick={() => setSelected(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(i);
                    }
                  }}
                  className={"axis-label " + (selected === i ? "active" : "")}
                >
                  <rect
                    x={Number(label[0]) - 47}
                    y={Number(label[1]) - 25}
                    width="94"
                    height="53"
                    rx="5"
                    fill="transparent"
                  />
                  <text
                    x={label[0]}
                    y={Number(label[1]) - 5}
                    textAnchor="middle"
                    fontSize="10"
                    letterSpacing="1.5"
                  >
                    {v.name.toUpperCase()}
                  </text>
                  <text
                    className="axis-value"
                    x={label[0]}
                    y={Number(label[1]) + 17}
                    textAnchor="middle"
                    fontSize="18"
                  >
                    {v.count ? Math.round(v.value) : "—"}
                  </text>
                </g>
              </g>
            );
          })}
          <path
            d="M301 310h18M310 301v18"
            stroke="#c6d8ec"
            strokeOpacity=".5"
          />
          <circle
            cx={c}
            cy={c}
            r="28"
            fill="none"
            stroke="#b1c5df"
            strokeOpacity=".1"
          />
        </svg>
      </motion.div>
      <div className="radar-readout" aria-live="polite">
        {selected !== null ? (
          <>
            <span>{d[selected].name}</span>
            <b>
              {d[selected].count
                ? `${Math.max(1, Math.round(d[selected].value - d[selected].band))}–${Math.min(99, Math.round(d[selected].value + d[selected].band))}`
                : "Unmeasured"}
            </b>
            <small>
              {d[selected].count
                ? `${d[selected].confidence} confidence · illustrative range`
                : "Complete a related test to form this dimension"}
            </small>
          </>
        ) : (
          <>
            <span>
              {results.length
                ? "PROFILE IN FORMATION"
                : "AWAITING FIRST SIGNAL"}
            </span>
            <small>Select a dimension to inspect</small>
          </>
        )}
      </div>
    </div>
  );
}
