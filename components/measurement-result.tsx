"use client";
import { TestResult } from "@/lib/model";
import { useDialog } from "./use-dialog";
import { MeasurementProfile } from "./measurement-panel";
export default function MeasurementResult({
  result,
  onProfile,
  onNext,
  onRetry,
  sessionFinal,
}: {
  result: TestResult;
  onProfile: () => void;
  onNext: () => void;
  onRetry?: () => void;
  sessionFinal?: boolean;
}) {
  const ref = useDialog(onProfile);
  return (
    <div
      ref={ref}
      className="test-overlay result-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Experiment results"
    >
      <div className="test-topbar">
        <button onClick={onProfile}>Close results</button>
        <span>SPATIAL / PROTOCOL 04</span>
        <span>10 EVIDENCE UPDATES</span>
      </div>
      <div className="result-content">
        <h1>Evidence collected.</h1>
        <p>
          {Math.round(result.rawScore)}% correct · mean active response{" "}
          {(result.responseTime / 1000).toFixed(1)}s. This session ended at θ{" "}
          {Number(result.metadata.theta).toFixed(2)}, SD{" "}
          {Number(result.metadata.sd).toFixed(2)}.
        </p>
        <button className="primary" onClick={onNext}>
          {sessionFinal ? "Session report" : "Continue"}
        </button>{" "}
        {onRetry && (
          <button className="secondary" onClick={onRetry}>
            Another spatial session
          </button>
        )}
        <MeasurementProfile />
      </div>
    </div>
  );
}
