"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function TechSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const techStack = [
    { name: "Solana", abbr: "SOL", description: "Lightning-fast finality, sub-cent fees." },
    { name: "WebAssembly", abbr: "WASM", description: "Near-native C++ game engine in the browser." },
    { name: "React / Next.js", abbr: "JSX", description: "Seamless Web3 onboarding & wallet UX." },
    { name: "Luanti", abbr: "LUA", description: "Modded Open-source Minecraft Clone." },
  ];

  return (
    <section id="tech" className="py-32 bg-[#F7F7F8] border-t border-zinc-100 relative z-10">
      <div className="container mx-auto px-6 md:px-12">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 font-heading mb-5 block">
            Powered By
          </span>
          <h2 className="text-3xl md:text-5xl font-heading font-semibold tracking-tight text-zinc-900 mb-20">
            The Bleeding Edge
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
            {techStack.map((tech, i) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group flex flex-col p-8 md:p-10 bg-[#F7F7F8] hover:bg-white transition-colors duration-300"
              >
                <span className="text-[11px] font-mono font-semibold text-zinc-400 tracking-widest mb-6 uppercase">
                  {tech.abbr}
                </span>
                <h3 className="font-heading font-semibold text-zinc-900 text-base mb-2 tracking-tight">
                  {tech.name}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed mt-auto pt-4">
                  {tech.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
