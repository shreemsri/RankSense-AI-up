"use client";
import { useEffect, useRef, useState } from "react";

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [clicked, setClicked] = useState(false);
  let mx = 0, my = 0;

  useEffect(() => {
    // Hide default cursor across the entire app
    document.body.style.cursor = 'none';

    const move = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${mx}px, ${my}px)`;
      }
    };

    const down = () => setClicked(true);
    const up = () => setClicked(false);

    document.addEventListener("mousemove", move);
    document.addEventListener("mousedown", down);
    document.addEventListener("mouseup", up);

    const attachListeners = () => {
      document.querySelectorAll("a, button, [role=button], input, textarea, select, .cursor-pointer").forEach(el => {
        (el as HTMLElement).style.cursor = 'none';
      });
    };

    attachListeners();
    const observer = new MutationObserver(attachListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("mouseup", up);
      observer.disconnect();
      document.body.style.cursor = 'auto'; // Reset on unmount
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 9999,
        transform: "translate(-100px, -100px)", // offscreen initially
        transition: "transform 0.05s linear",
      }}
    >
      {/* Bibata-style modern dark arrow with neon trace */}
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: clicked ? "scale(0.9)" : "scale(1)",
          transition: "transform 0.1s ease",
          transformOrigin: "top left"
        }}
      >
        {/* Core Arrow */}
        <path d="M4 2L18.4142 13.5284C19.3496 14.2767 19.1684 15.7566 18.0674 16.2753L13.5 18.4286L9.67137 25.1287C9.09848 26.1315 7.57602 26.1132 7.03198 25.097L4 19.4286L2 6.5L4 2Z" fill="#0F172A" />
        {/* Neon Outline */}
        <path d="M4 2L18.4142 13.5284C19.3496 14.2767 19.1684 15.7566 18.0674 16.2753L13.5 18.4286L9.67137 25.1287C9.09848 26.1315 7.57602 26.1132 7.03198 25.097L4 19.4286L2 6.5L4 2Z" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Inner Highlight for depth */}
        <path d="M5 4L16.5 13.2" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}
