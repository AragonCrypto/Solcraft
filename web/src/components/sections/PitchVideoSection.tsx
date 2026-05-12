"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

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

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-muted border border-border">
            <iframe
              src="https://www.youtube.com/embed/5MJEbiEo1Qw?rel=0&showinfo=0&autohide=1"

              title="Solcraft Pitch Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full border-0"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
