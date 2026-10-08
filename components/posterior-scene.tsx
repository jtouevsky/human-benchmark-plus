"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GRID, STEP, Posterior, prior } from "@/lib/measurement/model";
export default function PosteriorScene({
  posterior,
  previous,
  focus = 0,
  dimensions = false,
}: {
  posterior: Posterior;
  previous?: Posterior;
  focus?: number;
  dimensions?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    target = useRef(posterior),
    priorRef = useRef(previous),
    focusRef = useRef(focus),
    [failed, setFailed] = useState(false);
  target.current = posterior;
  priorRef.current = previous;
  focusRef.current = focus;
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5),
    );
    renderer.setClearColor(0, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(1.8, 3.2, 9.2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0.65, 0);
    controls.enableDamping = true;
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment(),
      environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    const light = new THREE.DirectionalLight(0xcddfff, 4);
    light.position.set(2, 5, 4);
    scene.add(light, new THREE.AmbientLight(0x9fafff, 1.3));
    const group = new THREE.Group();
    scene.add(group);
    const rows = 12,
      n = GRID.length,
      positions = new Float32Array(n * (rows + 1) * 3),
      uvs = new Float32Array(n * (rows + 1) * 2),
      indices: number[] = [];
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        uvs[k * 2] = i / (n - 1);
        uvs[k * 2 + 1] = j / rows;
        if (j < rows && i < n - 1) {
          indices.push(k, k + n, k + 1, k + 1, k + n, k + n + 1);
        }
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const uniforms = { phase: { value: 0 } };
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x7398ff,
      metalness: 0.65,
      roughness: 0.19,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      clearcoat: 1,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.phase = uniforms.phase;
      shader.vertexShader =
        "varying vec2 densityUV;\n" +
        shader.vertexShader.replace(
          "#include <uv_vertex>",
          "#include <uv_vertex>\ndensityUV = uv;",
        );
      shader.fragmentShader =
        "uniform float phase; varying vec2 densityUV;\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\nfloat sweep = pow(0.5 + 0.5*cos(densityUV.x*22.0-densityUV.y*3.0-phase),18.0); gl_FragColor.rgb += vec3(0.18,0.3,0.42)*sweep;",
        );
    };
    group.add(new THREE.Mesh(geo, material));
    // Independent marginal priors for unmeasured dimensions; no inferred correlations.
    const unmeasured: THREE.Mesh[] = [];
    if (dimensions) {
      const initial = prior();
      for (let d = 0; d < 5; d++) {
        const g = geo.clone(),
          pos = g.attributes.position as THREE.BufferAttribute;
        for (let j = 0; j <= rows; j++)
          for (let i = 0; i < n; i++)
            pos.setXYZ(
              j * n + i,
              GRID[i] * 0.62,
              (initial.mass[i] / STEP) * 3.7,
              (j / rows - 0.5) * 0.56 - 1.62 + d * 1.08,
            );
        g.computeVertexNormals();
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0xc3c9e6,
          metalness: 0.55,
          roughness: 0.35,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(g, mat);
        group.add(mesh);
        unmeasured.push(mesh);
      }
    }
    const grid = new THREE.GridHelper(8, 24, 0x91a3c8, 0x91a3c8);
    grid.position.y = -0.03;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.18;
    group.add(grid);
    const oldGeo = new THREE.BufferGeometry().setFromPoints(
        GRID.map((x) => new THREE.Vector3(x * 0.62, 0, -0.95)),
      ),
      oldMat = new THREE.LineBasicMaterial({
        color: 0xbfa9ff,
        transparent: true,
        opacity: 0.7,
      }),
      oldLine = new THREE.Line(oldGeo, oldMat);
    group.add(oldLine);
    const markerGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      markerMat = new THREE.LineBasicMaterial({ color: 0xd9fcff }),
      marker = new THREE.Line(markerGeo, markerMat);
    group.add(marker);
    const ridgeGeo = new THREE.BufferGeometry().setFromPoints(
        GRID.map((x) => new THREE.Vector3(x * 0.62, 0, 0.95)),
      ),
      ridgeMat = new THREE.LineBasicMaterial({ color: 0xbde7ff }),
      ridge = new THREE.Line(ridgeGeo, ridgeMat);
    group.add(ridge);
    let current = [...(previous ?? posterior).mass],
      visible = true,
      frame = 0,
      last = 0,
      dirty = true,
      lastTarget = target.current,
      lastFocus = focusRef.current;
    controls.addEventListener("change", () => {
      dirty = true;
    });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      dirty = true;
      const r = el.getBoundingClientRect();
      renderer.setSize(Math.max(1, r.width), Math.max(1, r.height));
      camera.aspect = r.width / Math.max(1, r.height);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      if (
        !visible ||
        document.hidden ||
        el.closest("[inert]") ||
        document.body.dataset.timing === "true"
      )
        return;
      if (time - last < 30) return;
      const dt = Math.min(0.1, (time - last) / 1000);
      last = time;
      if (
        motion.matches &&
        !dirty &&
        lastTarget === target.current &&
        lastFocus === focusRef.current
      )
        return;
      dirty = false;
      lastTarget = target.current;
      lastFocus = focusRef.current;
      const mix = motion.matches ? 1 : 1 - Math.exp(-dt * 4.5);
      current = current.map((x, i) => x + (target.current.mass[i] - x) * mix);
      for (let j = 0; j <= rows; j++)
        for (let i = 0; i < n; i++) {
          const k = (j * n + i) * 3;
          positions[k] = GRID[i] * 0.62;
          positions[k + 1] = (current[i] / STEP) * 3.7;
          positions[k + 2] =
            (j / rows - 0.5) * (dimensions ? 0.56 : 1.9) +
            (dimensions ? -2.7 : 0);
        }
      group.scale.y = Math.min(1, 3 / ((Math.max(...current) / STEP) * 3.7));
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      const old = oldGeo.attributes.position as THREE.BufferAttribute,
        ridgeP = ridgeGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < n; i++) {
        old.setY(
          i,
          ((priorRef.current ?? target.current).mass[i] / STEP) * 3.7,
        );
        ridgeP.setY(i, (current[i] / STEP) * 3.7);
      }
      if (dimensions) {
        for (let i = 0; i < n; i++) {
          old.setZ(i, -2.99);
          ridgeP.setZ(i, -2.41);
        }
      }
      old.needsUpdate = true;
      ridgeP.needsUpdate = true;
      const idx = Math.max(
          0,
          Math.min(n - 1, Math.round((focusRef.current + 6) / STEP)),
        ),
        m = markerGeo.attributes.position as THREE.BufferAttribute;
      m.setXYZ(0, GRID[idx] * 0.62, 0, dimensions ? -2.4 : 1);
      m.setXYZ(
        1,
        GRID[idx] * 0.62,
        (current[idx] / STEP) * 3.7 + 0.15,
        dimensions ? -2.4 : 1,
      );
      m.needsUpdate = true;
      if (!motion.matches) {
        uniforms.phase.value = time * 0.0005;
        light.position.x = 2 + Math.sin(time * 0.0003) * 2;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    const observer = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    observer.observe(el);
    frame = requestAnimationFrame(animate);
    const key = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const angle =
          e.key === "ArrowLeft" ? -0.14 : e.key === "ArrowRight" ? 0.14 : 0;
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        if (e.key === "ArrowUp") camera.position.multiplyScalar(0.94);
        if (e.key === "ArrowDown") camera.position.multiplyScalar(1.06);
        controls.update();
      }
    };
    el.addEventListener("keydown", key);
    const reset = () => {
      camera.position.set(1.8, 3.2, 9.2);
      controls.target.set(0, 0.65, 0);
      controls.update();
    };
    el.addEventListener("dblclick", reset);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ro.disconnect();
      el.removeEventListener("keydown", key);
      el.removeEventListener("dblclick", reset);
      controls.dispose();
      geo.dispose();
      material.dispose();
      oldGeo.dispose();
      oldMat.dispose();
      ridgeGeo.dispose();
      ridgeMat.dispose();
      markerGeo.dispose();
      markerMat.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      unmeasured.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      className="posterior-webgl"
      ref={host}
      tabIndex={0}
      role="img"
      aria-label="3D posterior density. Drag to rotate, arrow keys to rotate or zoom. Double-click to reset."
    >
      {failed && (
        <p>
          3D unavailable. The density chart and numeric estimates below remain
          available.
        </p>
      )}
    </div>
  );
}
