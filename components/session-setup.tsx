"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useDialog } from "./use-dialog";
import { X, Play, Check, Layers } from "lucide-react";
import { tests, TestType, CognitiveSession } from "@/lib/model";
export default function SessionSetup({
  onStart,
  onClose,
  pending,
  onResume,
}: {
  onStart: (order: TestType[]) => void;
  onClose: () => void;
  pending: CognitiveSession | null;
  onResume: () => void;
}) {
  const ref = useDialog(onClose);
  const [selected, setSelected] = useState<TestType[]>(tests.map((t) => t.id));
  return (
    <motion.div
      ref={ref}
      className="test-overlay setup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Configure cognitive session"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="test-topbar">
        <button autoFocus className="exit" onClick={onClose}>
          <X size={16} /> Close
        </button>
        <span className="session-label">SESSION CONFIGURATION</span>
      </div>
      <div className="setup-content">
        <div className="eyebrow">COGNITIVE SESSION / YOUR OWN PACE</div>
        <h1>
          One sitting.
          <br />
          <span>Multiple dimensions.</span>
        </h1>
        <p>
          Choose your experiments. Each result adds to your profile as you go.
        </p>
        {pending && (
          <button className="resume-panel" onClick={onResume}>
            <Layers size={20} />
            <span>
              Resume your unfinished session
              <small>
                {pending.results.length} of {pending.order.length} experiments
                saved
              </small>
            </span>
            <b>Resume</b>
          </button>
        )}
        <div className="session-options">
          {tests.map((t, i) => (
            <label
              key={t.id}
              className={selected.includes(t.id) ? "checked" : ""}
            >
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() =>
                  setSelected((s) =>
                    s.includes(t.id)
                      ? s.filter((x) => x !== t.id)
                      : [...s, t.id],
                  )
                }
              />
              <span className="selection-indicator">
                {selected.includes(t.id) && <Check size={14} />}
              </span>
              <span className="session-option-number">0{i + 1}</span>
              <span>
                {t.name}
                <small>{t.category}</small>
              </span>
              <em>{t.duration}</em>
            </label>
          ))}
        </div>
        <div className="setup-bottom">
          <span>
            {selected.length} experiments ·{" "}
            {selected.reduce(
              (a, t) => a + (t === "math" ? 3 : t === "reaction" ? 1 : 2),
              0,
            )}{" "}
            min estimated
          </span>
          <button
            className="primary"
            disabled={selected.length < 2}
            onClick={() =>
              onStart(
                tests.map((t) => t.id).filter((t) => selected.includes(t)),
              )
            }
          >
            <Play size={15} />{" "}
            {pending ? "Start a new session" : "Begin session"}
          </button>
        </div>
        <p className="test-footnote">
          Choose at least two. Completed experiments are saved even if you
          leave.
        </p>
      </div>
    </motion.div>
  );
}
