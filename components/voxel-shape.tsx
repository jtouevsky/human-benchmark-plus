import { Voxel } from "@/lib/spatial";
export default function VoxelShape({
  cells,
  angle = 0,
}: {
  cells: Voxel[];
  angle?: number;
}) {
  const min = [0, 1, 2].map((i) => Math.min(...cells.map((c) => c[i]))),
    max = [0, 1, 2].map((i) => Math.max(...cells.map((c) => c[i])));
  const centered = cells.map(
    (c) => c.map((v, i) => v - (min[i] + max[i]) / 2) as Voxel,
  );
  const project = ([x, y, z]: Voxel) => [(x - z) * 0.866, (x + z) * 0.5 - y];
  const points = centered.flatMap((c) =>
    [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1],
    ].map((d) => project(c.map((v, i) => v + d[i]) as Voxel)),
  );
  const extent = Math.max(...points.flat().map(Math.abs)) + 1,
    scale = 98 / extent;
  const faces = [
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1],
    ],
    [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    [
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
  ];
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden="true">
      <g transform={`rotate(${angle}) scale(${scale})`}>
        {centered
          .sort((a, b) => a[0] + a[2] - a[1] - (b[0] + b[2] - b[1]))
          .map((c, i) => (
            <g key={i}>
              {faces.map((face, j) => (
                <polygon
                  key={j}
                  points={face
                    .map((d) =>
                      project(c.map((v, k) => v + d[k]) as Voxel).join(","),
                    )
                    .join(" ")}
                  fill={["#b9d9ee", "#425d78", "#7394af"][j]}
                  stroke="#d4edff"
                  strokeWidth=".025"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          ))}
      </g>
    </svg>
  );
}
