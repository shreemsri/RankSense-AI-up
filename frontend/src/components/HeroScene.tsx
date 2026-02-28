"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth, H = mount.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    camera.position.z = 50;

    // ── Starfield ─────────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200 * 3; i++) starPos[i] = (Math.random() - 0.5) * 180;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x06B6D4, size: 0.22, transparent: true, opacity: 0.55 })));

    // ── Orbital rings removed per user request ──────────────────────────    // ── Floating resume card proxies ──────────────────────────────────────────
    const cards: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(4.5, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
      );
      const angle = (i / 8) * Math.PI * 2;
      const r = 20 + Math.random() * 6;
      card.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 14, Math.sin(angle) * r - 10);
      card.rotation.y = angle + 0.5;
      (card as any).userData = { speed: 0.002 + Math.random() * 0.002, angle, r };
      scene.add(card); cards.push(card);
    }

    // ── Violet particle cloud ─────────────────────────────────────────────────
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300 * 3; i++) pPos[i] = (Math.random() - 0.5) * 70;
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x7C3AED, size: 0.3, transparent: true, opacity: 0.4 })));

    // ── Mouse parallax removed ────────────────────────────────────────────────

    // ── Animation loop ────────────────────────────────────────────────────────
    let raf: number, t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.008;
      cards.forEach(c => {
        const d = c.userData as any;
        d.angle += d.speed;
        c.position.x = Math.cos(d.angle) * d.r;
        c.position.z = Math.sin(d.angle) * d.r - 10;
        c.rotation.y = d.angle + 0.5;
        c.position.y += Math.sin(t + d.angle) * 0.02;
      });
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W = mount.clientWidth, H = mount.clientHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}
