"use client";

export function MarqueeBanner() {
  const items = ["100% On-Chain", "Permadeath", "Full Loot", "WebAssembly", "No Downloads", "No Safe Zone", "Solana Native", "SPL Tokens"];

  // Duplicate for seamless loop
  const all = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-zinc-900 py-4 z-10 relative">
      <div
        className="flex whitespace-nowrap will-change-transform"
        style={{
          animation: "marquee 28s linear infinite",
        }}
      >
        {all.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-6 px-6">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 font-heading">
              {item}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/25 flex-shrink-0" />
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
