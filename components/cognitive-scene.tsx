"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { recentFor, tests, TestResult } from "@/lib/model";
export default function CognitiveScene({
  results,
  light = false,
}: {
  results: TestResult[];
  light?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    labels = useRef<(HTMLButtonElement | null)[]>([]),
    commands = useRef({ zoom: 1, reset: 0, paused: false }),
    [paused, setPaused] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [failure, setFailure] = useState(false);
  const data = useMemo(
    () => [
      ...tests.map((t) => {
        const records = recentFor(results, t.id),
          latest = records.at(-1);
        return {
          name: t.name,
          count: records.length,
          value: Math.min(100, Math.log2(records.length + 1) * 24),
          band:
            t.id === "spatial" && latest?.protocolVersion === 4
              ? Number(latest.metadata.sd)
              : 0,
          display: latest ? `${Math.round(latest.rawScore)} ${t.unit}` : "—",
          detail: latest
            ? `${records.length} observations · latest ${Math.round(latest.rawScore)} ${t.unit}${t.id === "spatial" && latest.protocolVersion === 4 ? ` · model SD ${Number(latest.metadata.sd).toFixed(2)}` : " · confidence not calibrated"}`
            : "No observations yet. Complete this test to add a signal.",
        };
      }),
      ...["Processing speed", "Attention"].map((name) => ({
        name,
        count: 0,
        value: 0,
        band: 0,
        display: "—",
        detail:
          "No separate measurement model. Not inferred from other scores.",
      })),
    ],
    [results],
  );
  const selection = useRef(selected);
  selection.current = selected;
  useEffect(() => {
    host.current?.dispatchEvent(new Event("atlas-command"));
  }, [selected, paused]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailure(true);
      return;
    }
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 650 ? 1.25 : 1.75),
    );
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 1, 8.4);
    camera.lookAt(0, 0, 0);
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment(),
      env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    const group = new THREE.Group();
    scene.add(group);
    group.rotation.set(-0.25, 0.25, -0.1);
    scene.add(new THREE.AmbientLight(0xc8ddff, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 4);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const blue = new THREE.PointLight(0x164bff, 15);
    blue.position.set(-3, -2, 3);
    scene.add(blue);
    const ink = light ? 0x2454cf : 0x96caff;
    const edge = new THREE.LineBasicMaterial({
      color: ink,
      transparent: true,
      opacity: 0.4,
    });
    const points = data.map((d, i) => {
      const a = (i * Math.PI) / 3 - Math.PI / 2,
        r = d.count ? 1.05 + (Math.min(100, d.value) / 100) * 1.1 : 1.0;
      return new THREE.Vector3(
        Math.cos(a) * r,
        Math.sin(a) * r,
        Math.min(d.count, 10) * 0.095,
      );
    });
    const meshFor = (band: number) => {
      const ps = data.map((d, i) => {
        const a = (i * Math.PI) / 3 - Math.PI / 2,
          r =
            (d.count ? 1.05 + (d.value / 100) * 1.1 : 1.0) +
            band * d.band * 0.25;
        return new THREE.Vector3(
          Math.cos(a) * r,
          Math.sin(a) * r,
          Math.min(d.count, 10) * 0.095,
        );
      });
      const positions: number[] = [];
      for (let i = 0; i < 6; i++) {
        const a = ps[i],
          b = ps[(i + 1) % 6];
        positions.push(
          0,
          0,
          -0.5,
          a.x,
          a.y,
          a.z,
          b.x,
          b.y,
          b.z,
          0,
          0,
          0.9,
          b.x,
          b.y,
          b.z,
          a.x,
          a.y,
          a.z,
        );
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.computeVertexNormals();
      return g;
    };
    const hull = new THREE.Mesh(
      meshFor(0),
      new THREE.MeshPhysicalMaterial({
        color: light ? 0x2766ff : 0x5793ff,
        metalness: 0.8,
        roughness: 0.12,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        clearcoat: 1,
      }),
    );
    group.add(hull);
    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(meshFor(1)),
      new THREE.LineBasicMaterial({
        color: ink,
        transparent: true,
        opacity: 0.25,
      }),
    );
    group.add(shell);
    group.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(hull.geometry),
        new THREE.LineBasicMaterial({
          color: light ? 0x1742bc : 0xe0f2ff,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    // Curved metallic seams follow the measured nodes rather than a fixed logo.
    const seamMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc3d4f4,
      metalness: 1,
      roughness: 0.2,
      clearcoat: 1,
    });
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];
      const middle = a.clone().add(b).multiplyScalar(0.62);
      middle.z += 0.28;
      const curve = new THREE.CatmullRomCurve3([a, middle, b]);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 24, 0.018, 6, false),
          seamMaterial,
        ),
      );
    });
    for (let ring = 0; ring < 3; ring++) {
      const p = Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(a) * (2.45 + ring * 0.13),
          Math.sin(a) * (2.45 + ring * 0.13),
          0,
        );
      });
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(p),
        edge,
      );
      line.rotation.x = ring === 1 ? Math.PI / 2 : 0;
      line.rotation.y = ring === 2 ? Math.PI / 2 : 0;
      group.add(line);
    }
    const nodes = points.map((p, i) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 16, 12),
        new THREE.MeshStandardMaterial({
          color: light ? 0x123eea : 0xd4efff,
          emissive: 0x3264dd,
          emissiveIntensity: 0.5,
        }),
      );
      m.position.copy(p);
      m.userData.dimension = i;
      group.add(m);
      const endpoint = p.clone().normalize().multiplyScalar(2.6);
      group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([p, endpoint]),
          edge,
        ),
      );
      return m;
    });
    const ray = new THREE.Raycaster(),
      mouse = new THREE.Vector2(),
      reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let active = true,
      frame = 0,
      last = 0,
      drag = false,
      moved = false,
      px = 0,
      py = 0,
      tx = -0.25,
      ty = 0.25,
      reset = 0,
      scale = reduced.matches ? 1 : 0.05;
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!frame) frame = requestAnimationFrame(draw);
    });
    resize.observe(el);
    const visibility = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        if (active && !frame) frame = requestAnimationFrame(draw);
      },
      { rootMargin: "100px" },
    );
    visibility.observe(el);
    function draw(t: number) {
      frame = 0;
      if (!active || document.hidden || el?.closest("[inert]")) return;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      if (commands.current.reset !== reset) {
        reset = commands.current.reset;
        tx = -0.25;
        ty = 0.25;
        commands.current.zoom = 1;
      }
      group.rotation.x += (tx - group.rotation.x) * 0.12;
      group.rotation.y += (ty - group.rotation.y) * 0.12;
      if (!drag && !reduced.matches && !commands.current.paused)
        ty += dt * 0.055;
      scale += (1 - scale) * (1 - Math.exp(-dt * 8));
      group.scale.setScalar(scale);
      camera.position.z +=
        (Math.max(8.4, (8.4 * 1.25) / camera.aspect) / commands.current.zoom -
          camera.position.z) *
        0.1;
      camera.lookAt(0, 0, 0);
      nodes.forEach((n, i) => {
        n.scale.setScalar(selection.current === i ? 1.9 : 1);
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        const pos = new THREE.Vector3(
          Math.cos(angle) * 2.5,
          Math.sin(angle) * 2.5,
          points[i].z,
        );
        group.localToWorld(pos);
        pos.project(camera);
        const label = labels.current[i];
        if (label) {
          label.style.transform = `translate(-50%,-50%) translate(${Math.max(48, Math.min(el!.clientWidth - 48, (pos.x * 0.5 + 0.5) * el!.clientWidth))}px,${Math.max(22, Math.min(el!.clientHeight - 22, (-pos.y * 0.5 + 0.5) * el!.clientHeight))}px)`;
          label.style.opacity = String(pos.z > 1 ? 0 : 0.8);
        }
      });
      renderer.render(scene, camera);
      el!.dataset.rendered = "true";
      el!.dataset.rotation = group.rotation.y.toFixed(3);
      const unsettled =
        Math.abs(tx - group.rotation.x) +
          Math.abs(ty - group.rotation.y) +
          Math.abs(1 - scale) +
          Math.abs(
            camera.position.z -
              Math.max(8.4, (8.4 * 1.25) / camera.aspect) /
                commands.current.zoom,
          ) >
        0.001;
      if ((!reduced.matches && !commands.current.paused) || drag || unsettled)
        frame = requestAnimationFrame(draw);
    }
    const wake = () => {
      if (active && !document.hidden && !frame)
        frame = requestAnimationFrame(draw);
    };
    el.addEventListener("atlas-command", wake);
    reduced.addEventListener("change", wake);
    const down = (e: PointerEvent) => {
      drag = true;
      moved = false;
      px = e.clientX;
      py = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      wake();
    };
    const move = (e: PointerEvent) => {
      if (drag) {
        const dx = e.clientX - px,
          dy = e.clientY - py;
        moved ||= Math.abs(dx) + Math.abs(dy) > 3;
        ty += dx * 0.008;
        tx = Math.max(-1.3, Math.min(1.3, tx + dy * 0.008));
        px = e.clientX;
        py = e.clientY;
        wake();
      } else {
        const b = el.getBoundingClientRect();
        mouse.set(
          ((e.clientX - b.left) / b.width) * 2 - 1,
          (-(e.clientY - b.top) / b.height) * 2 + 1,
        );
        ray.setFromCamera(mouse, camera);
        const hit = ray.intersectObjects(nodes)[0];
        renderer.domElement.style.cursor = hit ? "pointer" : "grab";
        if (hit) setSelected(hit.object.userData.dimension);
      }
    };
    const up = (e: PointerEvent) => {
      drag = false;
      if (!moved) {
        const b = el.getBoundingClientRect();
        mouse.set(
          ((e.clientX - b.left) / b.width) * 2 - 1,
          (-(e.clientY - b.top) / b.height) * 2 + 1,
        );
        ray.setFromCamera(mouse, camera);
        const hit = ray.intersectObjects(nodes)[0];
        if (hit) setSelected(hit.object.userData.dimension);
      }
    };
    const visible = () => {
      if (!document.hidden && active && !frame)
        frame = requestAnimationFrame(draw);
    };
    const inertObserver = new MutationObserver(visible);
    inertObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["inert"],
    });
    document.addEventListener("visibilitychange", visible);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "Rotate 3D profile with arrow keys",
    );
    renderer.domElement.addEventListener("keydown", (event) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
        if (event.key === "ArrowLeft") ty -= 0.15;
        if (event.key === "ArrowRight") ty += 0.15;
        if (event.key === "ArrowUp") tx = Math.max(-1.3, tx - 0.15);
        if (event.key === "ArrowDown") tx = Math.min(1.3, tx + 0.15);
        wake();
      }
    });
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      el.removeEventListener("atlas-command", wake);
      reduced.removeEventListener("change", wake);
      inertObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", visible);
      renderer.domElement.remove();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
      });
      env.dispose();
      renderer.dispose();
    };
  }, [data, light]);
  const d = selected === null ? null : data[selected];
  return (
    <div className={`cognitive-3d ${light ? "scene-light" : ""}`}>
      <div
        className="scene-stage"
        ref={host}
        aria-label="Interactive 3D cognitive structure"
      >
        <div className="scene-crosshair" aria-hidden="true" />
        <div className="scene-labels">
          {!failure &&
            data.map((d, i) => (
              <button
                key={d.name}
                ref={(el) => {
                  labels.current[i] = el;
                }}
                className={`scene-label ${selected === i ? "active" : ""}`}
                onPointerEnter={() => setSelected(i)}
                onClick={() => setSelected(i)}
                onFocus={() => setSelected(i)}
              >
                {d.name}
                <small>{d.display}</small>
              </button>
            ))}
        </div>
        {failure && (
          <div className="scene-fallback">
            3D is unavailable on this device.
            {data.map((d) => (
              <p key={d.name}>
                {d.name}: {d.display}
              </p>
            ))}
          </div>
        )}
      </div>
      <div
        className="scene-tools"
        onClick={() => host.current?.dispatchEvent(new Event("atlas-command"))}
      >
        <span>DRAG OR USE ARROW KEYS / SELECT A DIMENSION</span>
        <div>
          <button
            aria-label={paused ? "Resume rotation" : "Pause rotation"}
            aria-pressed={paused}
            onClick={() => {
              commands.current.paused = !paused;
              setPaused(!paused);
            }}
          >
            {paused ? "▷" : "Ⅱ"}
          </button>
          <button
            aria-label="Zoom out"
            onClick={() =>
              (commands.current.zoom = Math.max(
                0.8,
                commands.current.zoom - 0.1,
              ))
            }
          >
            −
          </button>
          <button
            aria-label="Reset 3D view"
            onClick={() => commands.current.reset++}
          >
            ↺
          </button>
          <button
            aria-label="Zoom in"
            onClick={() =>
              (commands.current.zoom = Math.min(
                1.3,
                commands.current.zoom + 0.1,
              ))
            }
          >
            +
          </button>
        </div>
      </div>
      <div className="scene-readout" aria-live="polite">
        <b>
          {d
            ? d.name
            : results.length
              ? "Your measured structure"
              : "An unmeasured structure"}
        </b>
        <span>
          {d
            ? d.count
              ? `${d.detail}`
              : d.detail
            : "Size and depth show observation count, not ability. The spatial outer band scales with model SD; other dimensions have no confidence band. Select a node for its actual score."}
        </span>
      </div>
    </div>
  );
}
