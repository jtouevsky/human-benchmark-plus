"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Decorative rendering only. No test state or measurement clocks enter here. */
export default function LiquidMetal({
  variant = "chrome",
}: {
  variant?: "chrome" | "lab";
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  const command = useRef({ turn: 0, pulse: 0 });
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1 : 1.5),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0.15, 8);
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.025);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.AmbientLight(0xdce5ff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 4),
      rim = new THREE.PointLight(variant === "lab" ? 0xa788ff : 0x3767ff, 35);
    key.position.set(3, 4, 3);
    rim.position.set(-3, 1, 3);
    scene.add(key, rim);
    const group = new THREE.Group();
    scene.add(group);
    // A thick, folded knot and a thinner nested ribbon: continuous surfaces,
    // not a sphere with a displaced texture.
    const material = new THREE.MeshPhysicalMaterial({
      color: variant === "lab" ? 0xbcaeff : 0xe4e8ef,
      metalness: 1,
      roughness: 0.135,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
    });
    const meshes = [0, 1].map((i) => {
      const geometry = new THREE.TorusKnotGeometry(
        i ? 1.02 : 1.4,
        i ? 0.085 : 0.29,
        180,
        16,
        variant === "lab" ? 3 : 2,
        variant === "lab" ? 4 : 3,
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.set(i * 0.9, i * 0.6, -0.3);
      group.add(mesh);
      return {
        mesh,
        base: Float32Array.from(geometry.attributes.position.array),
      };
    });
    const wire = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 160 }, (_, i) => {
          const a = (i / 160) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0);
        }),
      ),
      new THREE.LineBasicMaterial({
        color: variant === "lab" ? 0xd2bdff : 0x5577bd,
        transparent: true,
        opacity: 0.3,
      }),
    );
    wire.rotation.set(1, 0.35, 0.2);
    group.add(wire);
    const dustGeometry = new THREE.BufferGeometry();
    const dustBase = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const a = i * 2.399963;
      const r = 2.5 + (i % 11) / 12;
      dustBase.set(
        [Math.cos(a) * r, Math.sin(a) * r, Math.sin(i * 1.37) * 1.3],
        i * 3,
      );
    }
    dustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dustBase.slice(), 3),
    );
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: variant === "lab" ? 0xd5bbff : 0x294edd,
        size: 0.022,
        transparent: true,
        opacity: 0.65,
      }),
    );
    scene.add(dust);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true,
      frame = 0,
      drag = false,
      lastX = 0,
      lastY = 0,
      yaw = -0.35,
      pitch = 0.2,
      phase = 0,
      last = 0,
      burst = 0,
      scroll = 0,
      pointerX = 0,
      pointerY = 0,
      start = performance.now();
    const allowed = () =>
      visible &&
      !document.hidden &&
      !el.closest("[inert]") &&
      document.body.dataset.timing !== "true";
    const wake = () => {
      if (!frame && allowed()) frame = requestAnimationFrame(draw);
    };
    function draw(now: number) {
      frame = 0;
      if (!allowed()) return;
      const dt = Math.min(0.04, (now - last) / 1000 || 0.016);
      last = now;
      const moving = !reduced.matches && !pause.current;
      if (moving) phase += dt;
      burst += (command.current.pulse - burst) * 0.08;
      command.current.pulse *= 0.94;
      group.rotation.x += (pitch + pointerY * 0.1 - group.rotation.x) * 0.08;
      group.rotation.y +=
        (yaw + command.current.turn + scroll * 0.6 - group.rotation.y) * 0.08;
      group.rotation.z = -0.2 + (moving ? Math.sin(phase * 0.2) * 0.12 : 0);
      const assembled = reduced.matches ? 1 : Math.min(1, (now - start) / 950);
      group.scale.setScalar(
        (0.6 + 0.4 * (1 - Math.pow(1 - assembled, 3))) * (1 + scroll * 0.12),
      );
      for (const { mesh, base } of meshes) {
        const p = mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          const x = base[i * 3],
            y = base[i * 3 + 1],
            z = base[i * 3 + 2];
          const wave =
            Math.sin(y * 2.3 + phase * 0.75) * 0.09 +
            Math.cos(x * 2 + phase * 0.55) * 0.05;
          const distance = Math.hypot(x - pointerX * 2, y - pointerY * 2);
          const attraction = reduced.matches
            ? 0
            : Math.exp(-distance * distance * 0.8) * 0.17;
          const bend = scroll * 0.22 + burst * 0.1;
          p.setXYZ(
            i,
            x * (1 + wave) + attraction * pointerX,
            y * (1 + wave * 0.7) + Math.sin(x * 2 + phase) * bend,
            z +
              Math.sin(x * 2 + y + phase * 0.65) * (0.11 + scroll * 0.1) +
              attraction,
          );
        }
        p.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
      const dp = dustGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dp.count; i++) {
        const x = dustBase[i * 3],
          y = dustBase[i * 3 + 1],
          z = dustBase[i * 3 + 2];
        const dx = x - pointerX * 3,
          dy = y - pointerY * 3,
          f = reduced.matches ? 0 : Math.exp(-(dx * dx + dy * dy)) * 0.5;
        dp.setXYZ(
          i,
          x + dx * f,
          y + dy * f,
          z + Math.sin(phase * 0.5 + i) * 0.1,
        );
      }
      dp.needsUpdate = true;
      rim.position.x = -3 + Math.sin(phase * 0.6) * 2 + pointerX;
      material.roughness = 0.12 + scroll * 0.16;
      renderer.render(scene, camera);
      el.dataset.rendered = "true";
      el.dataset.phase = phase.toFixed(2);
      if (
        moving ||
        drag ||
        Math.abs(group.rotation.y - yaw - command.current.turn - scroll * 0.6) >
          0.001 ||
        burst > 0.001
      )
        wake();
    }
    const resize = () => {
      const r = el.getBoundingClientRect();
      renderer.setSize(Math.max(1, r.width), Math.max(1, r.height));
      camera.aspect = r.width / Math.max(1, r.height);
      camera.position.z = camera.aspect < 1 ? 10 : 8;
      camera.updateProjectionMatrix();
      wake();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      wake();
    });
    io.observe(el);
    const mo = new MutationObserver(wake);
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["inert", "data-timing"],
    });
    const onScroll = () => {
      const parent = el.closest(".chrome-journey") || el;
      const r = parent.getBoundingClientRect();
      scroll = Math.max(
        0,
        Math.min(1, -r.top / Math.max(1, r.height - innerHeight)),
      );
      el.dataset.scroll = scroll.toFixed(3);
      wake();
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointerX = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointerY = 1 - ((e.clientY - r.top) / r.height) * 2;
      if (drag) {
        yaw += (e.clientX - lastX) * 0.008;
        pitch = Math.max(-1, Math.min(1, pitch + (e.clientY - lastY) * 0.006));
      }
      lastX = e.clientX;
      lastY = e.clientY;
      el.dataset.interaction = "pointer";
      wake();
    };
    const down = (e: PointerEvent) => {
      drag = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      command.current.pulse = 1;
      wake();
    };
    const up = () => {
      drag = false;
      wake();
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    const keydown = (e: KeyboardEvent) => {
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Enter",
          " ",
        ].includes(e.key)
      ) {
        e.preventDefault();
        if (e.key === "ArrowLeft") yaw -= 0.2;
        else if (e.key === "ArrowRight") yaw += 0.2;
        else if (e.key === "ArrowUp") pitch -= 0.15;
        else if (e.key === "ArrowDown") pitch += 0.15;
        else command.current.pulse = 1;
        wake();
      }
    };
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive chrome sculpture. Drag or use arrow keys to rotate; Enter to ripple.",
    );
    renderer.domElement.addEventListener("keydown", keydown);
    const refresh = () => wake();
    el.addEventListener("visual-command", refresh);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", wake);
    resize();
    wake();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", wake);
      reduced.removeEventListener("change", wake);
      el.removeEventListener("visual-command", refresh);
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.Line ||
          o instanceof THREE.Points
        ) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);
  return (
    <div className={`liquid-metal liquid-metal-${variant}`}>
      <div
        ref={host}
        className="metal-canvas"
        role="group"
        aria-label="Liquid metal sculpture"
      >
        {failed && (
          <div
            className="metal-fallback"
            aria-label="Chrome ribbon illustration"
          >
            <i />
            <i />
            <i />
            <p>Interactive 3D is unavailable on this device.</p>
          </div>
        )}
      </div>
      <div className="metal-controls">
        <span>FORM / {variant === "lab" ? "02" : "01"} · DRAG TO EXPLORE</span>
        <button
          aria-label={paused ? "Resume sculpture" : "Pause sculpture"}
          onClick={() => {
            pause.current = !paused;
            setPaused(!paused);
            host.current?.dispatchEvent(new Event("visual-command"));
          }}
        >
          {paused ? "Play motion ↗" : "Pause motion Ⅱ"}
        </button>
      </div>
    </div>
  );
}
