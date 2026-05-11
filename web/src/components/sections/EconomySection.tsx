"use client";

import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

const points = [
  {
    index: "01",
    title: "dBlocks",
    description:
      "Place vending machines anywhere in the world to trade and exchange items or blocks 24/7 asynchronously. The blockchain handles escrow — no third party, no trust required.",
    image:
      "/assets/images/01.png",
  },
  {
    index: "02",
    title: "Deep Liquidity via Raydium",
    description:
      "Use ordinary DeFi methods directly from your browser. Every resource in Solcraft is an SPL token. Trade smoothly on Raydium pools with lightning-fast Solana finality.",
    image:
      "/assets/images/02.png",
  },
  {
    index: "03",
    title: "Skins & Resources",
    description:
      "Buy resources and NFTs and send them directly to your player wallet. Regular items appear in your inventory instantly, and NFTs can be equipped as fully on-chain 3D character skins.",
    image:
      "/assets/images/03.png",
  },
];

// Dotted side scroll indicator
function ScrollDots({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <div className="hidden md:flex flex-col items-center gap-3 sticky top-[50vh] self-start translate-y-[-50%] h-fit">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative flex items-center justify-center">
          <motion.div
            animate={{
              scale: activeIndex === i ? 1 : 0.55,
              backgroundColor: activeIndex === i ? "#09090B" : "transparent",
              borderColor: activeIndex === i ? "#09090B" : "#D4D4D8",
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-2.5 h-2.5 rounded-full border-[1.5px]"
            style={{ borderColor: "#D4D4D8" }}
          />
        </div>
      ))}
    </div>
  );
}

export function EconomySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="economy" className="bg-white relative z-10" ref={containerRef}>
      <div className="container mx-auto px-6 md:px-12 py-32">
        {/* Section header */}
        <div className="max-w-3xl mb-20 md:mb-32">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 font-heading mb-5 block">
            The Economy
          </span>
          <h2 className="text-3xl md:text-5xl font-heading font-semibold tracking-tight text-zinc-900">
            Everything is a Smart Contract
          </h2>
        </div>

        {/* Desktop: sticky scroll */}
        <div className="hidden md:grid grid-cols-[20px_1fr_1fr] gap-12 relative items-start">
          {/* Dotted progress indicator column */}
          <ScrollDots activeIndex={activeIndex} total={points.length} />

          {/* Text column */}
          <div className="flex flex-col">
            {points.map((point, index) => (
              <EconomyTextBlock
                key={point.title}
                point={point}
                index={index}
                setActiveIndex={setActiveIndex}
                isActive={activeIndex === index}
              />
            ))}
          </div>

          {/* Sticky image column */}
          <div className="sticky top-[20vh] h-[60vh] rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.1)] border border-zinc-100">
            {points.map((point, index) => (
              <motion.div
                key={point.title}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: activeIndex === index ? 1 : 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <img
                  src={point.image}
                  alt={point.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical stack */}
        <div className="md:hidden flex flex-col gap-16">
          {points.map((point) => (
            <div key={point.title} className="flex flex-col gap-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 font-heading">
                {point.index}
              </span>
              <div className="aspect-video rounded-xl overflow-hidden border border-zinc-100 shadow-sm">
                <img
                  src={point.image}
                  alt={point.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-heading font-semibold tracking-tight mb-3 text-zinc-900">
                  {point.title}
                </h3>
                <p className="text-zinc-500 text-base leading-relaxed">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EconomyTextBlock({
  point,
  index,
  setActiveIndex,
  isActive,
}: {
  point: (typeof points)[0];
  index: number;
  setActiveIndex: (val: number) => void;
  isActive: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" });

  if (isInView && !isActive) {
    setActiveIndex(index);
  }

  return (
    <div ref={ref} className="min-h-[70vh] flex flex-col justify-center pr-8">
      <motion.span
        animate={{ opacity: isActive ? 1 : 0.25 }}
        transition={{ duration: 0.4 }}
        className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 font-heading mb-6 block"
      >
        {point.index}
      </motion.span>
      <motion.h3
        animate={{ opacity: isActive ? 1 : 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-3xl md:text-4xl font-heading font-semibold tracking-tight mb-6 text-zinc-900"
      >
        {point.title}
      </motion.h3>
      <motion.p
        animate={{ opacity: isActive ? 1 : 0.2 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="text-zinc-500 text-lg leading-relaxed max-w-md"
      >
        {point.description}
      </motion.p>
    </div>
  );
}
