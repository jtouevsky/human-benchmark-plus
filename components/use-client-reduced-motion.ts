"use client";
import { useEffect, useState } from "react";
/** Match the server on the first render, then observe the user's preference.
 * CSS media queries already suppress animation during the hydration window. */
export function useClientReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      read = () => setReduced(media.matches);
    read();
    media.addEventListener("change", read);
    return () => media.removeEventListener("change", read);
  }, []);
  return reduced;
}
