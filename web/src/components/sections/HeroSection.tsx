"use client";

import { useRef, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import Link from "next/link";

// ─── Cloud layer ────────────────────────────────────────────────────────────
// pos at t=0 = left - (|delay|/duration)*200  → designed to be 0-100 (visible)
const CLOUDS = [
  { left: 110, dur: 65, delay: -15, top: "5%", op: 0.80, w: 200 },
  { left: 105, dur: 80, delay: -40, top: "12%", op: 0.60, w: 150 },
  { left: 120, dur: 50, delay: -5, top: "3%", op: 0.70, w: 240 },
  { left: 115, dur: 55, delay: -25, top: "8%", op: 0.58, w: 170 },
  { left: 125, dur: 45, delay: -10, top: "15%", op: 0.52, w: 130 },
];

function Cloud({ width, opacity }: { width: number; opacity: number }) {
  const b = `rgba(255,255,255,${opacity})`;
  const base: React.CSSProperties = {
    position: "absolute", borderRadius: "50%",
    background: b, filter: "blur(7px)",
  };
  return (
    <div style={{ position: "relative", width, height: width * 0.44 }}>
      <div style={{ ...base, left: "18%", top: "28%", width: "60%", height: "72%" }} />
      <div style={{ ...base, left: "38%", top: "0%", width: "44%", height: "88%" }} />
      <div style={{ ...base, left: "4%", top: "34%", width: "50%", height: "64%" }} />
      <div style={{ ...base, left: "62%", top: "38%", width: "36%", height: "56%" }} />
    </div>
  );
}

function CloudLayer() {
  return (
    // Overflow hidden to ensure clouds don't bleed outside hero
    <div style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none", overflow: "hidden", height: "22%" }}>
      {CLOUDS.map((c, i) => (
        <div key={i} style={{
          position: "absolute", top: c.top,
          left: `${c.left}vw`,
          animation: `cloudDrift ${c.dur}s linear ${c.delay}s infinite`,
        }}>
          <Cloud width={c.w} opacity={c.op} />
        </div>
      ))}
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

  // Scroll parallax (positive = moves down as user scrolls)
  const ySkyScroll = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const yFarScroll = useTransform(scrollYProgress, [0, 1], [0, 55]);
  const yTextScroll = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const yMidScroll = useTransform(scrollYProgress, [0, 1], [0, 25]);
  const yTerrScroll = useTransform(scrollYProgress, [0, 1], [0, 15]);
  const yFrontScroll = useTransform(scrollYProgress, [0, 1], [0, 5]);

  // Mouse tracking
  const rawMX = useMotionValue(0);
  const rawMY = useMotionValue(0);
  const sp = { damping: 32, stiffness: 95 };
  const mx = useSpring(rawMX, sp);
  const my = useSpring(rawMY, sp);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      rawMX.set(e.clientX - window.innerWidth / 2);
      rawMY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [rawMX, rawMY]);

  // Mouse parallax per depth — ALL SAME direction (positive = follows cursor)
  const xFar = useTransform(mx, v => v * 0.012);
  const yFar = useTransform(my, v => v * 0.008);
  const xText = useTransform(mx, v => v * 0.014);
  const yText = useTransform(my, v => v * 0.010);
  const xMid1 = useTransform(mx, v => v * 0.034);
  const yMid1 = useTransform(my, v => v * 0.024);
  const xMid2 = useTransform(mx, v => v * 0.048);
  const yMid2 = useTransform(my, v => v * 0.033);
  const xTerr = useTransform(mx, v => v * 0.065);
  const yTerr = useTransform(my, v => v * 0.045);
  const xFront = useTransform(mx, v => v * 0.088);
  const yFront = useTransform(my, v => v * 0.060);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        height: "100svh",
        // overflow:hidden clips ALL images — nothing bleeds below
        overflow: "hidden",
        background: "linear-gradient(170deg, #b8dbf7 0%, #78c2fc 48%, #5baee8 100%)",
      }}
    >

      {/* ── z-0: Sky atmosphere blobs ── */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0, y: ySkyScroll }}>
        <div style={{ position: "absolute", top: "10%", left: "6%", width: "28vw", height: "7vh", borderRadius: "50%", background: "rgba(255,255,255,0.22)", filter: "blur(32px)" }} />
        <div style={{ position: "absolute", top: "18%", right: "8%", width: "22vw", height: "5vh", borderRadius: "50%", background: "rgba(255,255,255,0.16)", filter: "blur(24px)" }} />
      </motion.div>

      {/* ── z-6: Animated clouds (behind everything) ── */}
      <CloudLayer />

      {/* ── z-10: FAR background — single large image, slowest ── */}
      <motion.div
        style={{
          position: "absolute", zIndex: 10,
          bottom: 0, left: "-5%", right: "-5%", height: "62%",
          x: xFar, y: yFarScroll,
        }}
      >
        <motion.img
          src="/assets/images/hero-far-bg.png"
          alt="" draggable={false}
          style={{
            y: yFar,
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top",
            WebkitMaskImage: "linear-gradient(to top, black 90%, transparent 100%)",
            maskImage: "linear-gradient(to top, black 90%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* ── z-20: SOLCRAFT TEXT — slightly lower (top:28%) ── */}
      <motion.div
        style={{
          position: "absolute", zIndex: 20,
          top: "28%", left: 0, right: 0,
          display: "flex", flexDirection: "column", alignItems: "center",
          pointerEvents: "none",
          x: xText, y: yTextScroll,
        }}
      >
        <motion.div style={{ y: yText, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-inter),'Inter',sans-serif",
              color: "rgba(255,255,255,0.75)",
              fontSize: "clamp(0.55rem, 1vw, 0.72rem)",
              letterSpacing: "0.38em",
              textTransform: "uppercase",
              marginBottom: "0.9rem",
            }}
          >
            The Voxel-Based Solana Metaverse
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
              fontSize: "clamp(4.5rem, 17vw, 13rem)",
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              fontWeight: 800,
              textShadow: "0 16px 48px rgba(0,0,0,0.12)",
            }}
          >
            SOLCRAFT
          </motion.h1>
        </motion.div>
      </motion.div>

      {/* ── z-30: MID-LEFT island — FULLY VISIBLE, ON TOP of text ── */}
      {/* height 78% means it starts at top 22%, overlapping SOLCRAFT at 28% */}
      <motion.div
        style={{
          position: "absolute", zIndex: 30,
          bottom: 0, left: "-8%",
          width: "55%", height: "78%",
          x: xMid1, y: yMidScroll,
        }}
      >
        <motion.img
          src="/assets/images/hero-mid-left.png"
          alt="" draggable={false}
          style={{
            y: yMid1,
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "center bottom",
            // Only soften the very top edge (5%) so no hard line
            WebkitMaskImage: "linear-gradient(to top, black 95%, transparent 100%)",
            maskImage: "linear-gradient(to top, black 95%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* ── z-32: MID-RIGHT island — FULLY VISIBLE, ON TOP of text, different speed ── */}
      <motion.div
        style={{
          position: "absolute", zIndex: 32,
          bottom: 0, right: "-8%",
          width: "50%", height: "74%",
          x: xMid2, y: yMidScroll,
        }}
      >
        <motion.img
          src="/assets/images/hero-mid-right.png"
          alt="" draggable={false}
          style={{
            y: yMid2,
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "center bottom",
            WebkitMaskImage: "linear-gradient(to top, black 95%, transparent 100%)",
            maskImage: "linear-gradient(to top, black 95%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* ── z-36: TERRAIN LEFT (hero.jpg) ── */}
      <motion.div
        style={{
          position: "absolute", zIndex: 36,
          bottom: 0, left: "-4%",
          width: "45%", height: "64%",
          x: xTerr, y: yTerrScroll,
        }}
      >
        <motion.div style={{
          y: yTerr,
          width: "100%", height: "100%",
          backgroundImage: "url('/assets/images/hero.png')",
          backgroundSize: "cover", backgroundPosition: "left bottom",
          WebkitMaskImage: "linear-gradient(to right, black 40%, transparent 100%), linear-gradient(to top, black 94%, transparent 100%)",
          maskImage: "linear-gradient(to right, black 40%, transparent 100%), linear-gradient(to top, black 94%, transparent 100%)",
          WebkitMaskComposite: "intersect", maskComposite: "intersect",
        }} />
      </motion.div>

      {/* ── z-38: TERRAIN RIGHT mirrored ── */}
      <motion.div
        style={{
          position: "absolute", zIndex: 38,
          bottom: 0, right: "-4%",
          width: "45%", height: "64%",
          x: xTerr, y: yTerrScroll,
          scaleX: -1,
        }}
      >
        <motion.div style={{
          y: yTerr,
          width: "100%", height: "100%",
          backgroundImage: "url('/assets/images/hero.png')",
          backgroundSize: "cover", backgroundPosition: "left bottom",
          WebkitMaskImage: "linear-gradient(to right, black 40%, transparent 100%), linear-gradient(to top, black 94%, transparent 100%)",
          maskImage: "linear-gradient(to right, black 40%, transparent 100%), linear-gradient(to top, black 94%, transparent 100%)",
          WebkitMaskComposite: "intersect", maskComposite: "intersect",
        }} />
      </motion.div>

      {/* ── z-42: FOREGROUND — highest image, just below buttons ── */}
      {/* Covers full width at the bottom, fastest cursor movement */}
      <motion.div
        style={{
          position: "absolute", zIndex: 42,
          bottom: 0, left: "-5%", right: "-5%",
          height: "42%",
          x: xFront, y: yFrontScroll,
        }}
      >
        <motion.img
          src="/assets/images/hero-foreground.png"
          alt="" draggable={false}
          style={{
            y: yFront,
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top",
            WebkitMaskImage: "linear-gradient(to top, black 88%, transparent 100%)",
            maskImage: "linear-gradient(to top, black 88%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* ── z-50: BUTTONS — moved high (bottom:32%) ── */}
      <motion.div
        style={{
          position: "absolute", zIndex: 50,
          bottom: "32%", left: 0, right: 0,
          display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "1rem",
          padding: "0 1.5rem",
        }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="flex-col sm:flex-row"
      >
        <Link
          href="/play"
          style={{ fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif" }}
          className="group relative overflow-hidden bg-white text-[#0f172a] px-8 py-3.5 rounded-sm font-medium text-xs tracking-[0.22em] uppercase transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 w-full sm:w-auto text-center"
        >
          <span className="relative z-10">Enter The Frontier</span>
          <span className="absolute inset-0 bg-black/[0.06] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </Link>
        <Link
          href="#pitch"
          style={{ fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif" }}
          className="bg-black/20 backdrop-blur-sm text-white border border-white/20 px-8 py-3.5 rounded-sm font-medium text-xs tracking-[0.22em] uppercase hover:bg-black/30 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto text-center"
        >
          Watch Pitch
        </Link>
      </motion.div>

      {/* ── z-60: WHITE GRADIENT — fades bottom to page bg; overflow:hidden clips images ── */}
      <div
        style={{
          position: "absolute", zIndex: 60,
          bottom: 0, left: 0, right: 0, height: "160px",
          background: "linear-gradient(to top, #FAFAFA 0%, rgba(250,250,250,0.0) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
