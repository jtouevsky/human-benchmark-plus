"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useClientReducedMotion } from "./use-client-reduced-motion";
import { HorizontalGallery, MagneticButton } from "./experience";
import { FluxField } from "./engine-home";
import { TestResult, TestType } from "@/lib/model";
const Metal = dynamic(() => import("./liquid-metal"), {
  ssr: false,
  loading: () => (
    <div className="metal-loading">
      <i />
      <span>ASSEMBLING MATTER</span>
    </div>
  ),
});
export function Sculpture({
  variant = "chrome",
}: {
  variant?: "chrome" | "lab";
}) {
  const ref = useRef<HTMLDivElement>(null),
    [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="sculpture-slot">
      {seen && <Metal variant={variant} />}
    </div>
  );
}
export function SceneEnvironment({ mode }: { mode: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current!;
    const move = (e: PointerEvent) => {
      if (
        node.closest("[inert]") ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      node.style.setProperty(
        "--cursor-x",
        `${(e.clientX / innerWidth) * 100}%`,
      );
      node.style.setProperty(
        "--cursor-y",
        `${(e.clientY / innerHeight) * 100}%`,
      );
    };
    window.addEventListener("pointermove", move, { passive: true });
    const visibility = () =>
      node.classList.toggle("world-paused", document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`world-atmosphere world-${mode.toLowerCase()}`}
    >
      <div className="world-light" />
      <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="currentColor">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={
                mode === "History"
                  ? `M-100 ${180 + i * 38} C200 ${-100 + i * 45} 600 ${1000 - i * 26} 1300 ${220 + i * 28}`
                  : `M${150 + i * 32} -100 C${1100 - i * 23} 180 ${-100 + i * 38} 700 ${1000 + i * 24} 1000`
              }
            />
          ))}
        </g>
      </svg>
      <div className="world-grain" />
    </div>
  );
}
export function SceneTransition({ scene }: { scene: string }) {
  const reduced = useClientReducedMotion();
  return (
    <div
      key={scene}
      className={`scene-transition ${reduced ? "transition-reduced" : ""}`}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
      <span>{scene.toUpperCase()} / HB++</span>
    </div>
  );
}
export function MotionTitle({ children }: { children: string }) {
  const reduced = useClientReducedMotion();
  return (
    <span
      className="motion-type"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const b = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--type-weight",
          String(450 + ((e.clientX - b.left) / b.width) * 350),
        );
        e.currentTarget.style.setProperty(
          "--type-stretch",
          String(0.98 + ((e.clientY - b.top) / b.height) * 0.04),
        );
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.setProperty("--type-weight", "650");
        e.currentTarget.style.setProperty("--type-stretch", "1");
      }}
    >
      {children}
    </span>
  );
}
export function ChromeHome({
  start,
  onSession,
  onLab,
  onProfile,
}: {
  results: TestResult[];
  start: (t: TestType) => void;
  onSession: () => void;
  onLab: () => void;
  onProfile: () => void;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = matchMedia("(max-width: 540px)"),
      read = () => setCompact(media.matches);
    read();
    media.addEventListener("change", read);
    return () => media.removeEventListener("change", read);
  }, []);
  const hero = useRef<HTMLElement>(null),
    story = useRef<HTMLElement>(null),
    reduced = useClientReducedMotion();
  const { scrollYProgress: p } = useScroll({
    target: hero,
    offset: ["start start", "end end"],
  });
  const titleX = useTransform(p, [0, 1], ["0%", "-16%"]),
    titleY = useTransform(p, [0, 1], [0, -80]),
    tint = useTransform(p, [0, 1], ["#eff0f3", "#b8c8ff"]);
  const { scrollYProgress: s } = useScroll({
    target: story,
    offset: ["start start", "end end"],
  });
  const z = useTransform(s, [0, 1], [0, 280]),
    rotate = useTransform(s, [0, 1], [-25, 65]),
    path = useTransform(s, [0, 0.85], [0, 1]),
    text = useTransform(s, [0, 1], [70, -90]);
  return (
    <>
      <section className="chrome-journey" ref={hero}>
        <motion.div
          className="chrome-sticky"
          style={{ backgroundColor: reduced || compact ? "#eff0f3" : tint }}
        >
          <div className="edition-line">
            <span>HUMAN BENCHMARK++</span>
            <span>AN EXPLORATION OF YOU / 004</span>
            <span>PRIVATE BY NATURE</span>
          </div>
          <motion.h1
            className="chrome-title"
            style={
              reduced || compact ? { x: 0, y: 0 } : { x: titleX, y: titleY }
            }
          >
            <MotionTitle>Your mind,</MotionTitle>
            <br />
            <span className="outline-type">in motion.</span>
            <sup>↗</sup>
          </motion.h1>
          <div className="hero-sculpture">
            <Sculpture />
          </div>
          <div className="hero-note">
            <span className="micro-label">NOT A LIMIT. A STARTING POINT.</span>
            <p>
              A collection of experiments in speed,
              <br />
              memory, logic, and perspective.
            </p>
          </div>
          <div className="hero-actions">
            <MagneticButton
              className="primary mercury-button"
              onClick={() => start("reaction")}
            >
              Start a test <b>↗</b>
            </MagneticButton>
            <button className="text-action" onClick={onProfile}>
              Explore your profile <span>↗</span>
            </button>
          </div>
          <div className="hero-bottom">
            <span>SCROLL TO CHANGE THE STATE OF MATTER ↓</span>
            <span>01 — LIQUID CHROME</span>
          </div>
        </motion.div>
      </section>
      <section className="depth-journey" ref={story}>
        <div className="depth-sticky">
          <div className="depth-caption">
            <span>02 / SIGNAL FROM NOISE</span>
            <span>FOUR WAYS TO SURPRISE YOURSELF</span>
          </div>
          <div className="depth-tunnel" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <motion.i
                key={i}
                style={reduced ? {} : { z, rotate, scale: 1 + i * 0.22 }}
              />
            ))}
          </div>
          <motion.svg
            className="drawn-signal"
            viewBox="0 0 1000 700"
            aria-hidden="true"
          >
            <motion.path
              d="M-100 500 C200 0 800 800 1050 200 M-100 510 C300 600 500 -100 1100 400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              style={{ pathLength: reduced ? 1 : path }}
            />
          </motion.svg>
          <motion.div className="depth-copy" style={reduced ? {} : { y: text }}>
            <span className="micro-label">FOLLOW YOUR CURIOSITY</span>
            <h2>
              Less guessing.
              <br />
              <em>More discovering.</em>
            </h2>
            <p>
              Find your rhythm. Hold a pattern. Turn a problem around.
              <br />
              Come back and see what changes.
            </p>
            <MagneticButton
              className="primary mercury-button"
              onClick={onSession}
            >
              Run a full session <b>↗</b>
            </MagneticButton>
          </motion.div>
        </div>
      </section>
      <HorizontalGallery start={start} />
      <section
        className="lens-world"
        onPointerMove={(e) => {
          if (reduced) return;
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty(
            "--lens-x",
            `${e.clientX - r.left}px`,
          );
          e.currentTarget.style.setProperty(
            "--lens-y",
            `${e.clientY - r.top}px`,
          );
        }}
      >
        <div className="lens-grid" aria-hidden="true" />
        <span className="micro-label">
          03 / INTERFERENCE FIELD · MOVE THROUGH IT
        </span>
        <h2>
          There is more
          <br />
          beneath the surface.
        </h2>
        <FluxField />
        <div className="lens-actions">
          <p>
            Small experiments. Unexpected discoveries.
            <br />
            Time, chance, attention, and everything between.
          </p>
          <MagneticButton className="primary mercury-button" onClick={onLab}>
            Enter the Lab ↗
          </MagneticButton>
        </div>
      </section>
    </>
  );
}
