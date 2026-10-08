"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  FlaskConical,
  Grid2X2,
  History,
  House,
  Orbit,
  Play,
  Plus,
  ChevronRight,
  X,
  Layers,
  ScanLine,
} from "lucide-react";
import { EngineHome } from "@/components/engine-home";
import { MeasurementProfile } from "@/components/measurement-panel";
import { HomeExperience, AmbientScene } from "@/components/experience";
import Lab from "@/components/lab";
import { Progression } from "@/components/field-system";
import BrandMark from "@/components/brand";
import TestGlyph from "@/components/test-glyph";
import TestEngine from "@/components/test-engine";
import SessionSetup from "@/components/session-setup";
import {
  Library,
  Profile,
  HistoryView,
  Results,
  SessionReport,
} from "@/components/views";
import {
  tests,
  TestResult,
  TestType,
  profile,
  demoResults,
  CognitiveSession,
  validateResult,
} from "@/lib/model";
import { startingLevel } from "@/lib/adaptive";
const STORAGE = "hb-results-v1",
  PENDING = "hb-session-v2";
export default function Home() {
  const [view, setView] = useState("Home"),
    [results, setResults] = useState<TestResult[]>([]),
    [demo, setDemo] = useState(false),
    [ready, setReady] = useState(false),
    [active, setActive] = useState<TestType | null>(null),
    [result, setResult] = useState<TestResult | null>(null),
    [session, setSession] = useState<CognitiveSession | null>(null),
    [inSession, setInSession] = useState(false),
    [setup, setSetup] = useState(false),
    [report, setReport] = useState(false),
    [archivedReport, setArchivedReport] = useState<CognitiveSession | null>(
      null,
    ),
    [storageError, setStorageError] = useState(false);
  const savedIds = useRef(new Set<string>()),
    data = useMemo(() => (demo ? demoResults() : results), [demo, results]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  const persist = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setStorageError(true);
    }
  };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      if (Array.isArray(saved)) {
        const valid = saved.filter(validateResult);
        setResults(valid);
        savedIds.current = new Set(valid.map((r) => r.id));
      }
      const pending = JSON.parse(localStorage.getItem(PENDING) || "null");
      if (
        pending &&
        typeof pending.id === "string" &&
        Array.isArray(pending.order) &&
        pending.order.length >= 2 &&
        pending.order.length <= 4 &&
        new Set(pending.order).size === pending.order.length &&
        pending.order.every((t: unknown) => tests.some((x) => x.id === t)) &&
        Array.isArray(pending.results) &&
        pending.results.every(validateResult) &&
        pending.results.every(
          (r: TestResult, i: number) => r.testType === pending.order[i],
        )
      ) {
        if (
          !pending.completedAt &&
          pending.results.length < pending.order.length
        )
          setSession(pending);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: unknown,
          ) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "read_cognitive_profile",
            description:
              "Read locally saved cognitive task dimensions, observation counts, and simulated percentile estimates.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: (input: unknown) => {
              if (
                !input ||
                typeof input !== "object" ||
                Object.keys(input).length
              )
                throw new Error("Expected an empty object");
              return {
                dimensions: profile(results),
                observations: results.length,
                percentiles: "simulated",
                protocols: { reaction: 2, memory: 2, math: 2, spatial: 3 },
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [results]);
  const start = (t: TestType) => {
    setInSession(false);
    setDemo(false);
    setActive(t);
    setResult(null);
  };
  const begin = (order: TestType[]) => {
    const next: CognitiveSession = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      order,
      results: [],
    };
    setSession(next);
    persist(PENDING, next);
    setInSession(true);
    setDemo(false);
    setSetup(false);
    setResult(null);
    setActive(order[0]);
  };
  const resume = () => {
    if (!session) return;
    setDemo(false);
    setSetup(false);
    setInSession(true);
    setActive(session.order[session.results.length]);
    setResult(null);
  };
  const finish = (raw: TestResult) => {
    if (savedIds.current.has(raw.id)) return;
    savedIds.current.add(raw.id);
    const r =
      inSession && session
        ? {
            ...raw,
            sessionId: session.id,
            metadata: {
              ...raw.metadata,
              sessionStartedAt: session.startedAt,
              sessionTotal: session.order.length,
              sessionOrder: session.order.map((t) =>
                tests.findIndex((x) => x.id === t),
              ),
            },
          }
        : raw;
    setResults((old) => {
      const next = [...old, r];
      persist(STORAGE, next);
      return next;
    });
    if (inSession && session) {
      const next = {
        ...session,
        results: [...session.results, r],
        ...(session.results.length + 1 === session.order.length
          ? { completedAt: Date.now() }
          : {}),
      };
      setSession(next);
      persist(PENDING, next.completedAt ? null : next);
    }
    setActive(null);
    setResult(r);
  };
  const next = () => {
    setResult(null);
    if (inSession && session) {
      if (session.results.length === session.order.length) setReport(true);
      else setActive(session.order[session.results.length]);
    } else
      setActive(
        tests[(tests.findIndex((t) => t.id === result?.testType) + 1) % 4].id,
      );
  };
  const exit = () => {
    setActive(null);
    setResult(null);
    setInSession(false);
  };
  const analysis = () => {
    exit();
    setView("Profile");
  };
  const overlay = active !== null || result !== null || report || setup;
  const explored = new Set(data.map((r) => r.testType)).size;
  const pending = session && !session.completedAt ? session : null;
  return (
    <MotionConfig reducedMotion="user">
      <main
        aria-busy={!ready}
        className={`environment environment-${view.toLowerCase()}`}
      >
        {!overlay && <AmbientScene mode={view} />}
        <div inert={overlay}>
          <header>
            <a className="brand" href="/" aria-label="Human Benchmark home">
              <BrandMark />
              <span>
                human<span className="brand-light">benchmark</span>
                <sup>++</sup>
                <small>ADAPTIVE MEASUREMENT ENGINE</small>
              </span>
            </a>
            <nav className="nav" aria-label="Main navigation">
              {[
                { name: "Home", icon: House },
                { name: "Tests", icon: Grid2X2 },
                { name: "Profile", icon: Orbit },
                { name: "History", icon: History },
                { name: "Lab", icon: FlaskConical },
              ].map(({ name, icon: Icon }) => (
                <button
                  aria-current={view === name ? "page" : undefined}
                  key={name}
                  className={view === name ? "selected" : ""}
                  onClick={() => setView(name)}
                >
                  <Icon size={15} />
                  <span>{name}</span>
                  {view === name && (
                    <motion.i
                      layoutId="nav-active"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 35,
                      }}
                    />
                  )}
                </button>
              ))}
            </nav>
            <div className="header-right">
              <span className="local-label">
                ON DEVICE<span>PRIVATE BY DESIGN</span>
              </span>
              <button
                className="avatar"
                onClick={() => setView("Profile")}
                aria-label="Open your profile"
              >
                <ScanLine size={19} />
              </button>
            </div>
          </header>
          <AnimatePresence mode="wait">
            <motion.section
              key={view}
              initial={{
                opacity: 0,
                scale: 0.97,
                rotateX: 3,
                filter: "blur(8px)",
              }}
              animate={{
                opacity: 1,
                scale: 1,
                rotateX: 0,
                filter: "blur(0px)",
              }}
              exit={{ opacity: 0, scale: 1.025, filter: "blur(5px)" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {view === "Home" ? (
                <>
                  <EngineHome
                    results={data}
                    start={start}
                    onSession={() => setSetup(true)}
                    onLab={() => setView("Lab")}
                  />
                  <Progression results={data} onStart={() => setSetup(true)} />
                  {pending && (
                    <button className="resume-strip" onClick={resume}>
                      <Layers size={19} />
                      <span>
                        Pick up where you left off.
                        <small>
                          {pending.results.length} of {pending.order.length}{" "}
                          experiments saved
                        </small>
                      </span>
                      <b>Resume session</b>
                    </button>
                  )}
                </>
              ) : view === "Tests" ? (
                <Library results={data} start={start} />
              ) : view === "Profile" ? (
                <Profile
                  results={data}
                  start={() => start("spatial")}
                  demo={demo}
                />
              ) : view === "History" ? (
                <HistoryView
                  results={data}
                  start={() => setView("Tests")}
                  onOpenSession={(s) => {
                    setArchivedReport(s);
                    setReport(true);
                  }}
                />
              ) : (
                <>
                  <Lab />
                  <div className="page-content">
                    <MeasurementProfile start={() => start("spatial")} />
                  </div>
                </>
              )}
            </motion.section>
          </AnimatePresence>
          <footer>
            <span>
              <BrandMark /> HUMAN VARIATION, MEASURED.
            </span>
            <button onClick={() => setDemo(!demo)}>
              {demo ? "Exit demo profile" : "Explore a demo profile"}{" "}
              <Orbit size={14} />
            </button>
            <span>EXPLORER 03 · EXPLORATORY, NOT DIAGNOSTIC</span>
          </footer>
        </div>
        {demo && !overlay && (
          <div className="demo-banner">
            Illustrative demo · not your results{" "}
            <button onClick={() => setDemo(false)}>
              Exit <X size={13} />
            </button>
          </div>
        )}
        {storageError && (
          <div role="status" className="storage-error">
            Browser storage is unavailable or contains unreadable data. New
            results remain available in this tab.
          </div>
        )}
        <AnimatePresence mode="wait">
          {setup ? (
            <SessionSetup
              key="setup"
              onStart={begin}
              onClose={() => setSetup(false)}
              pending={pending}
              onResume={resume}
            />
          ) : active ? (
            <TestEngine
              key={active + (session?.results.length || 0)}
              type={active}
              previous={results}
              onFinish={finish}
              onExit={exit}
              sessionLabel={
                inSession && session
                  ? `SESSION / ${session.results.length + 1} OF ${session.order.length}`
                  : undefined
              }
              sessionProgress={
                session ? session.results.length / session.order.length : 0
              }
            />
          ) : result ? (
            <Results
              key={result.id}
              result={result}
              previous={results.filter((r) => r.id !== result.id)}
              onRetry={inSession ? undefined : () => start(result.testType)}
              onProfile={analysis}
              onNext={next}
              sessionLabel={
                inSession && session
                  ? `${session.results.length} OF ${session.order.length} EXPERIMENTS COMPLETE`
                  : undefined
              }
              sessionFinal={
                !!(
                  inSession &&
                  session &&
                  session.results.length === session.order.length
                )
              }
            />
          ) : report && (archivedReport || session) ? (
            <SessionReport
              key="report"
              session={(archivedReport || session)!}
              previous={results.filter(
                (r) =>
                  r.sessionId !== (archivedReport || session)!.id &&
                  r.timestamp < (archivedReport || session)!.startedAt,
              )}
              onClose={() => {
                setReport(false);
                setArchivedReport(null);
                setInSession(false);
                setView("Profile");
              }}
            />
          ) : null}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
