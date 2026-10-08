"use client";
import { useClientReducedMotion as useReducedMotion } from "./use-client-reduced-motion";
import { useRef, useState, useEffect, useId } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowUpRight, ArrowDown, Play } from "lucide-react";
import SceneLoader from "./scene-loader";
import TestGlyph from "./test-glyph";
import { TestResult, TestType, tests, recentFor } from "@/lib/model";
export function GlassSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <div
      className={`liquid-surface ${className}`}
      onPointerMove={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--light-x",
          `${e.clientX - b.left}px`,
        );
        e.currentTarget.style.setProperty(
          "--light-y",
          `${e.clientY - b.top}px`,
        );
      }}
    >
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <filter id={uid}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".014 .04"
              numOctaves="1"
              seed="8"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="9"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <div
        className="glass-refraction"
        style={{ backdropFilter: `url(#${uid}) blur(2px)` }}
        aria-hidden="true"
      />
      <div className="glass-caustic" aria-hidden="true" />
      {children}
    </div>
  );
}
export function MagneticButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  const x = useMotionValue(0),
    y = useMotionValue(0),
    sx = useSpring(x, { stiffness: 230, damping: 18 }),
    sy = useSpring(y, { stiffness: 230, damping: 18 }),
    reduced = useReducedMotion();
  return (
    <motion.button
      className={`magnetic ${className}`}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.12);
        y.set((e.clientY - r.top - r.height / 2) * 0.15);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
export function AmbientScene({ mode }: { mode: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) =>
      ref.current?.classList.toggle("ambient-paused", !e.isIntersecting),
    );
    if (ref.current) o.observe(ref.current);
    const hidden = () =>
      ref.current?.classList.toggle("ambient-paused", document.hidden);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      o.disconnect();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  return (
    <div
      ref={ref}
      className={`ambient-scene ambient-${mode.toLowerCase()}`}
      aria-hidden="true"
    >
      <div className="ambient-contours" />
      <div className="ambient-scanner" />
      <svg viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="currentColor">
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse
              key={i}
              cx="740"
              cy="440"
              rx={170 + i * 35}
              ry={290 + i * 22}
              transform={`rotate(-35 740 440)`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
export function HomeExperience({
  results,
  start,
  onSession,
  onLab,
}: {
  results: TestResult[];
  start: (t: TestType) => void;
  onSession: () => void;
  onLab: () => void;
}) {
  const hero = useRef(null),
    story = useRef(null),
    reduced = useReducedMotion(),
    { scrollYProgress: p } = useScroll({
      target: hero,
      offset: ["start start", "end start"],
    }),
    y = useTransform(p, [0, 1], [0, 140]),
    rotate = useTransform(p, [0, 1], [-18, 65]),
    scale = useTransform(p, [0, 1], [1, 1.8]),
    { scrollYProgress: s } = useScroll({
      target: story,
      offset: ["start center", "end center"],
    }),
    path = useTransform(s, [0, 0.8], [0, 1]);
  return (
    <>
      <section className="editorial-hero" ref={hero}>
        <div className="hero-registration">
          <span>HUMAN BENCHMARK / FIELD 04</span>
          <span>PERSONAL INSTRUMENTS FOR A CURIOUS MIND</span>
        </div>
        <motion.div
          className="giant-orbit"
          style={reduced ? {} : { rotate, scale }}
        />
        <h1 className="editorial-title">
          <motion.span
            initial={{ y: 45, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.65 }}
          >
            A mind.
          </motion.span>
          <motion.span
            initial={{ y: 45, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.65 }}
          >
            Many <em>dimensions.</em>
          </motion.span>
        </h1>
        <motion.div className="hero-object" style={{ y: reduced ? 0 : y }}>
          <SceneLoader results={results} light />
        </motion.div>
        <div className="hero-side-note">
          <span>01 — 06</span>
          <p>
            You are not
            <br />a single number.
          </p>
        </div>
        <GlassSurface className="hero-glass-note">
          <span className="micro-label">YOUR NEXT DISCOVERY</span>
          <p>
            Measure a moment.
            <br />
            Reveal a pattern.
          </p>
          <MagneticButton className="cobalt-button" onClick={onSession}>
            Start a session <ArrowUpRight size={19} />
          </MagneticButton>
        </GlassSurface>
        <div className="hero-bottom-note">
          <p>
            Reaction. Memory. Spatial reasoning.
            <br />A different perspective with every experiment.
          </p>
          <span>
            SCROLL TO EXPLORE <ArrowDown size={14} />
          </span>
        </div>
      </section>
      <section className="scroll-story" ref={story}>
        <div className="story-sticky">
          <span className="micro-label">
            THE HUMAN SIGNAL / THREE PERSPECTIVES
          </span>
          <svg viewBox="0 0 600 600" className="story-orbit" aria-hidden="true">
            <circle
              cx="300"
              cy="300"
              r="218"
              fill="none"
              stroke="currentColor"
              opacity=".1"
            />
            <motion.path
              d="M300 82 C590 82 590 518 300 518 C10 518 10 82 300 82 C490 82 490 390 300 390 C110 390 110 200 300 200"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ pathLength: reduced ? 1 : path }}
            />
            <motion.circle
              cx="300"
              cy="300"
              r="78"
              fill="none"
              stroke="currentColor"
              style={{ scale: reduced ? 1 : scale }}
            />
            <text x="300" y="310" textAnchor="middle">
              YOU
            </text>
          </svg>
          <span className="vertical-note">OBSERVE / REPEAT / UNDERSTAND</span>
        </div>
        <div className="story-chapters">
          {[
            [
              "01",
              "Capture the moment.",
              "Discover the small differences in how you perceive, recall, and respond. Each core test offers one specific perspective.",
            ],
            [
              "02",
              "Let a pattern emerge.",
              "A single score is a moment. Repeating an experiment builds a more useful picture of your own performance.",
            ],
            [
              "03",
              "Go beyond familiar.",
              "Explore six experimental studies in perception and attention. Follow your curiosity into the Lab.",
            ],
          ].map(([n, title, body], i) => (
            <motion.article
              key={n}
              initial={{ opacity: 0.2, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.55 }}
              transition={{ duration: 0.6 }}
            >
              <span>{n} / FIELD NOTES</span>
              <h2>{title}</h2>
              <p>{body}</p>
              {i === 2 && (
                <MagneticButton className="editorial-link" onClick={onLab}>
                  Enter the experimental Lab <ArrowUpRight size={20} />
                </MagneticButton>
              )}
            </motion.article>
          ))}
        </div>
      </section>
      <HorizontalGallery start={start} />
      <section className="home-closing">
        <span className="micro-label">
          THE MOST INTERESTING COMPARISON IS YOU.
        </span>
        <h2>
          Not your limit.
          <br />
          <em>Your starting point.</em>
        </h2>
        <MagneticButton className="round-launch" onClick={onSession}>
          <Play size={25} />
          <span>BEGIN</span>
        </MagneticButton>
      </section>
    </>
  );
}
export function HorizontalGallery({ start }: { start: (t: TestType) => void }) {
  const target = useRef(null),
    track = useRef<HTMLDivElement>(null),
    [distance, setDistance] = useState(0),
    [mobile, setMobile] = useState(false),
    reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
      target,
      offset: ["start start", "end end"],
    }),
    x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  useEffect(() => {
    const update = () => {
      setMobile(innerWidth < 760);
      setDistance(
        Math.max(0, (track.current?.scrollWidth || 0) - innerWidth + 80),
      );
    };
    update();
    const o = new ResizeObserver(update);
    if (track.current) o.observe(track.current);
    window.addEventListener("resize", update);
    return () => {
      o.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <section
      ref={target}
      className={`horizontal-section ${mobile || reduced ? "horizontal-static" : ""}`}
    >
      <div className="gallery-sticky">
        <div className="gallery-heading">
          <span className="micro-label">
            FOUR INSTRUMENTS / ONE CURIOUS MIND
          </span>
          <h2>
            Find your <em>frequency.</em>
          </h2>
          <span className="gallery-instruction">
            {mobile
              ? "SWIPE THE COLLECTION →"
              : "SCROLL TO MOVE THROUGH THE COLLECTION →"}
          </span>
        </div>
        <div className="gallery-window">
          <motion.div
            ref={track}
            className="gallery-track"
            style={{ x: mobile || reduced ? 0 : x }}
          >
            {tests.map((t, i) => (
              <motion.button
                layoutId={`instrument-${t.id}`}
                key={t.id}
                className={`instrument-object instrument-${t.id}`}
                onClick={() => start(t.id)}
              >
                <div className="instrument-index">
                  0{i + 1}
                  <span>{t.category}</span>
                </div>
                <div className="instrument-art">
                  <TestGlyph type={t.id} />
                  <i />
                  <i />
                </div>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <span className="instrument-open">
                  ENTER EXPERIMENT <ArrowUpRight size={24} />
                </span>
              </motion.button>
            ))}
          </motion.div>
        </div>
        <div className="gallery-progress">
          <motion.i style={{ scaleX: reduced ? 1 : scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}
export function DataRibbon({ results }: { results: TestResult[] }) {
  const [type, setType] = useState<TestType>("reaction"),
    [index, setIndex] = useState(0),
    series = recentFor(results, type).slice(-16),
    selected = series[Math.min(index, series.length - 1)],
    max = Math.max(1, ...series.map((r) => r.rawScore));
  return (
    <section className="data-ribbon">
      <div className="ribbon-heading">
        <span className="micro-label">
          TEMPORAL FIELD / RECENT 16 OBSERVATIONS
        </span>
        <div>
          {tests.map((t) => (
            <button
              key={t.id}
              aria-pressed={type === t.id}
              onClick={() => {
                setType(t.id);
                setIndex(0);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div
        className="ribbon-scene"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || !series.length) return;
          const b = e.currentTarget.getBoundingClientRect();
          setIndex(
            Math.min(
              series.length - 1,
              Math.max(
                0,
                Math.floor(((e.clientX - b.left) / b.width) * series.length),
              ),
            ),
          );
        }}
      >
        <div className="ribbon-plane">
          {series.map((r, i) => (
            <button
              key={r.id}
              aria-label={`Observation ${i + 1}: ${r.rawScore.toFixed(1)} ${tests.find((t) => t.id === type)!.unit}`}
              className={index === i ? "selected" : ""}
              style={{ height: `${35 + (r.rawScore / max) * 115}px` }}
              onFocus={() => setIndex(i)}
              onClick={() => setIndex(i)}
            >
              <i />
              <span>{String(i + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
        {!series.length && (
          <p className="ribbon-empty">
            Your first observation will create the first marker.
          </p>
        )}
      </div>
      <div className="ribbon-readout">
        <span>SCRUB THE FIELD / USE THE SLIDER</span>
        <strong>
          {selected
            ? `${selected.rawScore.toFixed(1)} ${tests.find((t) => t.id === type)!.unit}`
            : "—"}
        </strong>
        <span>
          {selected
            ? new Date(selected.timestamp).toLocaleDateString()
            : "AWAITING SIGNAL"}
        </span>
      </div>
      {series.length > 1 && (
        <input
          aria-label="Scrub performance history"
          type="range"
          min={0}
          max={series.length - 1}
          value={Math.min(index, series.length - 1)}
          onChange={(e) => setIndex(Number(e.target.value))}
        />
      )}
      <p className="ribbon-caption">
        Height = raw score. Depth = sequence in time. Same-protocol observations
        only; no cross-task score comparison.
      </p>
    </section>
  );
}
