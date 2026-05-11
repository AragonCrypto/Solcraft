"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const features = [
  {
    title: "Browser-Native",
    description:
      "Frictionless onboarding via WebAssembly. Connect your Phantom wallet and spawn instantly. No 2GB downloads. Play in your tab.",
    image: "/assets/images/browser-native.png",
    gridArea: "browser",
  },
  {
    title: "Permadeath & Full Loot",
    description:
      "Step outside the safe zone and risk it all. If you die, your character is wiped and your on-chain assets drop to the floor. No second chances.",
    image: "/assets/images/permadeath.png",
    gridArea: "death",
  },
  {
    title: "100% On-Chain Economy",
    description:
      "Every resource mined is an SPL token. Trade seamlessly using in-game Automated Market Makers. The blockchain is the bank.",
    image: "/assets/images/on-chain-economy.png",
    gridArea: "economy",
  },
];

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-32 bg-[#F7F7F8] relative z-10">
      <div className="container mx-auto px-6 md:px-12">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 28 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mb-16"
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 mb-5 block"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            The Frontier
          </span>
          <h2
            className="text-3xl md:text-5xl font-semibold tracking-tight mb-6 text-zinc-900"
            style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          >
            What Makes Solcraft Different
          </h2>
          <p
            className="text-base md:text-lg text-zinc-500 leading-relaxed max-w-xl"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            Not another idle clicker. This is a living, breathing world where every block, trade, and death is immutably recorded on Solana.
          </p>
        </motion.div>

        {/* Bento grid:
            Desktop:
              Col 1-2: Browser-Native (top-left)     Col 3: Permadeath (spans 2 rows, tall)
              Col 1-2: 100% On-Chain (bottom-left)   Col 3: Permadeath continues...
        */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{
            gridTemplateAreas: `
              "browser browser death"
              "economy economy death"
            `,
          }}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  isInView,
}: {
  feature: (typeof features)[0];
  index: number;
  isInView: boolean;
}) {
  // Heights: browser & economy shorter, death is tall (spans 2)
  const minHeights: Record<string, string> = {
    browser: "320px",
    death: "668px",  // roughly browser + gap + economy heights
    economy: "320px",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{
        duration: 0.85,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative overflow-hidden rounded-xl"
      style={{
        gridArea: feature.gridArea,
        minHeight: minHeights[feature.gridArea],
      }}
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={feature.image}
          alt={feature.title}
          className="w-full h-full object-cover transition-transform duration-[1.3s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent group-hover:from-black/72 transition-all duration-500" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 md:p-10 h-full flex flex-col justify-end">
        <div className="transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-y-4 group-hover:translate-y-0">
          <h3
            className="text-xl md:text-2xl font-semibold tracking-wide mb-3 text-white"
            style={{
              fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            {feature.title}
          </h3>
          <p
            className="text-sm text-white/65 leading-relaxed max-w-sm md:opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            {feature.description}
          </p>
        </div>
      </div>

      {/* Ring */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 pointer-events-none" />
    </motion.div>
  );
}
