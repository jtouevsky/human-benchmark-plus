"use client";
import { useClientReducedMotion as useReducedMotion } from "./use-client-reduced-motion";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { TestResult, TestType } from "@/lib/model";
import { PosteriorView, EstimateStrip } from "./measurement-panel";
import { useMeasurement } from "./use-measurement";
import { HorizontalGallery, MagneticButton } from "./experience";
export function FluxField() {
  const ref = useRef<SVGSVGElement>(null),
    reduced = useReducedMotion();
  return (
    <svg
      ref={ref}
      className="flux-field"
      viewBox="0 0 800 240"
      aria-label="Decorative magnetic interference field"
      role="img"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect(),
          x = ((e.clientX - r.left) / r.width) * 800,
          y = ((e.clientY - r.top) / r.height) * 240;
        ref.current?.querySelectorAll("circle").forEach((c) => {
          const cx = Number(c.dataset.x),
            cy = Number(c.dataset.y),
            d = Math.hypot(cx - x, cy - y),
            f = Math.max(0, 1 - d / 160);
          c.setAttribute("cx", String(cx + (cx - x) * f * 0.35));
          c.setAttribute("cy", String(cy + (cy - y) * f * 0.35));
        });
      }}
      onPointerLeave={() =>
        ref.current?.querySelectorAll("circle").forEach((c) => {
          c.setAttribute("cx", c.dataset.x!);
          c.setAttribute("cy", c.dataset.y!);
        })
      }
    >
      {Array.from({ length: 180 }, (_, i) => {
        const x = 20 + (i % 30) * 26,
          y = 25 + Math.floor(i / 30) * 37;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            data-x={x}
            data-y={y}
            r={1.4}
            fill="currentColor"
          />
        );
      })}
      <path
        d="M0 120 C130 -60 230 300 400 120 S650 -60 800 120"
        fill="none"
        stroke="currentColor"
        strokeWidth=".8"
      />
      <path
        d="M0 120 C130 300 230 -60 400 120 S650 300 800 120"
        fill="none"
        stroke="currentColor"
        strokeWidth=".8"
      />
    </svg>
  );
}
export function EngineHome({
  start,
  onLab,
  onSession,
}: {
  results: TestResult[];
  start: (t: TestType) => void;
  onLab: () => void;
  onSession: () => void;
}) {
  const state = useMeasurement(),
    hero = useRef(null),
    story = useRef(null),
    reduced = useReducedMotion();
  const { scrollYProgress: p } = useScroll({
      target: hero,
      offset: ["start start", "end start"],
    }),
    spacing = useTransform(p, [0, 1], ["-.08em", ".03em"]),
    y = useTransform(p, [0, 1], [0, 90]);
  const { scrollYProgress: s } = useScroll({
      target: story,
      offset: ["start 80%", "end 35%"],
    }),
    path = useTransform(s, [0, 1], [0, 1]),
    rotate = useTransform(s, [0, 1], [-45, 135]);
  return (
    <>
      <section className="engine-hero" ref={hero}>
        <div className="engine-registration">
          <span>HB++ / MEASUREMENT ENGINE</span>
          <span>01 — SPATIAL CALIBRATION</span>
          <span>LOCAL & PRIVATE</span>
        </div>
        <motion.h1
          style={{
            letterSpacing: reduced ? "-.08em" : spacing,
            y: reduced ? 0 : y,
          }}
          className="kinetic-title"
          onPointerMove={(ev) => {
            if (reduced || ev.pointerType !== "mouse") return;
            const b = ev.currentTarget.getBoundingClientRect();
            ev.currentTarget.style.setProperty(
              "--weight",
              String(350 + (450 * (ev.clientX - b.left)) / b.width),
            );
          }}
          onPointerLeave={(ev) =>
            ev.currentTarget.style.setProperty("--weight", "520")
          }
        >
          Nothing is
          <br />
          <span>
            certain<span className="certainty-note">yet.</span>
          </span>
        </motion.h1>
        <div className="engine-lede">
          <span className="coordinate-mark">θ / 01</span>
          <p>
            One answer shifts a belief.
            <br />
            The next question follows the evidence.
          </p>
          <MagneticButton
            className="primary instrument-button"
            onClick={() => start("spatial")}
          >
            Start spatial calibration <span>↗</span>
          </MagneticButton>
        </div>
        <div className="engine-surface">
          <div className="surface-aside">
            <span>LIVE MATHEMATICAL STATE</span>
            <h2>
              {state.posterior.observations
                ? "A shape made\nof evidence."
                : "Room for\nuncertainty."}
            </h2>
            <p>
              {state.posterior.observations
                ? "Your saved spatial responses determine this distribution."
                : "This is the initial prior, before any spatial observations. No demo scores."}
            </p>
            <span className="material-swatch">
              BAYESIAN SURFACE / DRAG TO INSPECT
            </span>
          </div>
          <PosteriorView posterior={state.posterior} />
        </div>
        {state.error && <p role="alert">{state.error}</p>}
        <EstimateStrip posterior={state.posterior} />
      </section>
      <section className="evidence-story" ref={story}>
        <div className="story-sticky">
          <span className="eyebrow">HOW A BELIEF TAKES SHAPE</span>
          <h2>
            Observe.
            <br />
            <em>Reconsider.</em>
            <br />
            Repeat.
          </h2>
          <motion.svg
            viewBox="0 0 400 300"
            className="belief-orbit"
            style={{ rotate: reduced ? 0 : rotate }}
            aria-hidden="true"
          >
            <motion.path
              d="M200 30 C420 30 420 270 200 270 C-20 270 -20 30 200 30 M60 150 C60 -40 340 -40 340 150 C340 340 60 340 60 150"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ pathLength: reduced ? 1 : path }}
            />
            <circle cx="200" cy="150" r="13" fill="currentColor" />
          </motion.svg>
        </div>
        <div className="story-steps">
          {[
            [
              "01 / PRIOR",
              "Begin with a range.",
              "An unknown ability starts with a broad normal prior. The width describes uncertainty, not a lack of potential.",
            ],
            [
              "02 / EVIDENCE",
              "Let the answer move it.",
              "Correctness changes the probability of each possible ability. Difficult correct answers and easy incorrect answers carry different evidence.",
            ],
            [
              "03 / SELECTION",
              "Ask a better question.",
              "The engine compares ten generated tasks and selects the one expected to reduce uncertainty the most.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="flux-interlude">
        <span>INTERFERENCE STUDY / MOVE THROUGH THE FIELD</span>
        <FluxField />
        <p>Decorative geometry. Measured data stays in the density surface.</p>
      </section>
      <HorizontalGallery start={start} />
      <section className="engine-closing">
        <span className="eyebrow">SIX DIMENSIONS / AN OPEN EXPERIMENT</span>
        <h2>
          The next question
          <br />
          is the interesting one.
        </h2>
        <MagneticButton
          className="primary instrument-button"
          onClick={onSession}
        >
          Run a full session ↗
        </MagneticButton>
        <MagneticButton className="secondary" onClick={onLab}>
          Enter the Lab ↗
        </MagneticButton>
        <p>
          Spatial has a Bayesian model. Other tests remain standalone
          experiments.
        </p>
      </section>
    </>
  );
}
