import Link from "next/link";

export function FooterCTA() {
  return (
    <footer className="bg-white border-t border-zinc-100 pt-24 pb-12">
      <div className="container mx-auto px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 font-heading mb-6">
            Colosseum Frontier Hackathon
          </p>
          <h2 className="text-4xl md:text-[3.5rem] font-heading font-semibold tracking-tight text-zinc-900 mb-6 leading-tight">
            Ready to risk your wallet?
          </h2>
          <p className="text-base md:text-lg text-zinc-500 leading-relaxed mb-12 max-w-xl mx-auto">
            No safe zone. No respawn. Every death is permanent, every asset is
            real. Enter the frontier — if you dare.
          </p>
          <Link
            href="/play"
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-3.5 rounded-[4px] font-heading font-bold text-sm tracking-[0.15em] uppercase hover:bg-zinc-800 transition-all duration-200 hover:-translate-y-0.5"
          >
            Play Now
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 mt-20 pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-zinc-400">
          &copy; {new Date().getFullYear()} Solcraft. All rights reserved.
        </p>
        <div className="flex gap-8">
          {["YouTube"].map((item) => (
            <Link key={item} href="https://www.youtube.com/watch?v=5MJEbiEo1Qw" className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors duration-200">
              {item}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
