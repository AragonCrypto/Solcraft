"use client";

import { useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";

export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none"
      style={{ x, y }}
    >
      {/* Arrow cursor SVG — tip aligns with mouse position at (0,0) */}
      <svg
        width="26"
        height="32"
        viewBox="0 0 26 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Drop shadow for visibility on all backgrounds */}
        <filter id="cs" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
        </filter>
        <path
          d="M2 1 L2 23 L7.5 17.5 L11.5 27.5 L15 26 L11 16 L19 16 Z"
          fill="white"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#cs)"
        />
      </svg>
    </motion.div>
  );
}
