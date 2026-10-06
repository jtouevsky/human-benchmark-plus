"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { TestResult } from "@/lib/model";
const Scene = dynamic(() => import("./cognitive-scene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <i />
      ASSEMBLING COGNITIVE FIELD
    </div>
  ),
});
export default function SceneLoader(props: {
  results: TestResult[];
  light?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [seen, setSeen] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          o.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return (
    <div ref={ref} className="scene-loader">
      {seen ? (
        <Scene {...props} />
      ) : (
        <div className="scene-loading">COGNITIVE FIELD / 3D</div>
      )}
    </div>
  );
}
