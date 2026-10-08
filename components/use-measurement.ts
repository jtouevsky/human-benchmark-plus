"use client";
import { useEffect, useMemo, useState } from "react";
import { loadEvents, Observation } from "@/lib/experimental-data/store";
import { replay } from "@/lib/experimental-data/store";
import { estimate } from "@/lib/measurement/model";
export function useMeasurement() {
  const [events, setEvents] = useState<Observation[]>([]),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setEvents(loadEvents());
        setError("");
      } catch {
        setError(
          "Saved measurements could not be read. The archive is preserved; new measurements are blocked until it can be recovered.",
        );
      }
      setReady(true);
    };
    read();
    window.addEventListener("hb-measurement", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("hb-measurement", read);
      window.removeEventListener("storage", read);
    };
  }, []);
  const posterior = useMemo(() => replay(events), [events]);
  return {
    events,
    posterior,
    estimate: useMemo(() => estimate(posterior), [posterior]),
    error,
    ready,
  };
}
