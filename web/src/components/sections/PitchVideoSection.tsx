"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Play } from "lucide-react";

export function PitchVideoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pitch" className="py-32 bg-background relative z-10">
      <div className="container mx-auto px-6 md:px-12 text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto"
        >
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading mb-4 block">
            The Vision
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tight uppercase mb-12">
            Watch the Solcraft Pitch
          </h2>

          <a
            href="https://www.youtube.com/watch?v=5MJEbiEo1Qw"
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-muted border border-border group block"
          >
            <img
              src="/assets/images/banner.png"
              alt="Solcraft Pitch Video"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <Play className="w-8 h-8 text-black fill-black ml-1" />
              </div>
            </div>
            
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg">
                <p className="text-white text-sm font-bold tracking-wider uppercase">Watch on YouTube</p>
              </div>
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
