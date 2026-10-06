import { TestType } from "@/lib/model";
export default function TestGlyph({ type }: { type: TestType }) {
  return (
    <svg
      viewBox="0 0 160 100"
      fill="none"
      aria-hidden="true"
      className={"test-glyph " + type}
    >
      {type === "reaction" ? (
        <>
          <path
            d="M8 52h38l13-27 17 51 14-42 11 18h51"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="101" cy="52" r="6" fill="currentColor" fillOpacity=".2" />
          <path
            d="M10 20v60M150 20v60"
            stroke="currentColor"
            strokeOpacity=".12"
          />
        </>
      ) : type === "memory" ? (
        Array.from({ length: 16 }, (_, i) => (
          <rect
            key={i}
            x={39 + (i % 4) * 22}
            y={7 + Math.floor(i / 4) * 22}
            width="17"
            height="17"
            rx="3"
            stroke="currentColor"
            strokeOpacity=".4"
            fill="currentColor"
            fillOpacity={[1, 5, 6, 8, 14].includes(i) ? 0.4 : 0.02}
          />
        ))
      ) : type === "math" ? (
        <>
          <text
            x="80"
            y="59"
            textAnchor="middle"
            fill="currentColor"
            fontSize="34"
            fontFamily="Space Grotesk Variable"
          >
            x<tspan fillOpacity=".4"> / </tspan>y
          </text>
          <path d="M28 78h104" stroke="currentColor" strokeOpacity=".2" />
          <circle cx="27" cy="28" r="2" fill="currentColor" />
          <circle cx="130" cy="72" r="2" fill="currentColor" />
        </>
      ) : (
        <g transform="translate(80 50) rotate(-22)">
          <path
            d="m0-36 35 20v34L0 38-35 18v-34Z M-35-16 0 5 35-16M0 5v33M0-36v21l18 10"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path d="m0 5 35-21v34L0 38Z" fill="currentColor" fillOpacity=".12" />
        </g>
      )}
    </svg>
  );
}
