"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";

type WalletState = "idle" | "connecting" | "success" | "error" | "no-wallet";

export default function PlayPage() {
  const [walletState, setWalletState] = useState<WalletState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Simulate auto-connect behavior on mount
    const connectWallet = async () => {
      setWalletState("connecting");
      
      // Artificial delay to show the connecting state
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        if ("solana" in window) {
          const provider = (window as any).solana;
          if (provider?.isPhantom) {
            // Attempt to connect to phantom
            await provider.connect();
            setWalletState("success");
          } else {
            setWalletState("error");
            setErrorMessage("Phantom wallet not found. Please install the Phantom extension.");
          }
        } else {
          setWalletState("no-wallet");
        }
      } catch (err: any) {
        setWalletState("error");
        setErrorMessage(err.message || "Failed to connect to Phantom wallet.");
      }
    };

    connectWallet();
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col relative overflow-hidden text-foreground">
      {/* Abstract Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="p-6 md:p-12 z-10">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-heading font-bold text-sm uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Solcraft
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight uppercase mb-4">
              Enter The Frontier
            </h1>
            <p className="text-muted-foreground text-lg">
              Authenticating via Solana...
            </p>
          </div>

          <div className="bg-secondary/50 backdrop-blur-xl border border-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {walletState === "connecting" && (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center text-center py-8"
                >
                  <Loader2 className="w-12 h-12 mb-6 text-foreground animate-spin" />
                  <h3 className="font-heading font-bold text-xl uppercase mb-2">Requesting Connection</h3>
                  <p className="text-muted-foreground text-sm">Please approve the request in your Phantom wallet.</p>
                </motion.div>
              )}

              {walletState === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center text-center py-8"
                >
                  <CheckCircle2 className="w-12 h-12 mb-6 text-green-500" />
                  <h3 className="font-heading font-bold text-xl uppercase mb-2 text-green-500">Wallet Connected</h3>
                  <p className="text-muted-foreground text-sm">Loading character data and initializing WebAssembly client...</p>
                </motion.div>
              )}

              {walletState === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center text-center py-8"
                >
                  <AlertCircle className="w-12 h-12 mb-6 text-red-500" />
                  <h3 className="font-heading font-bold text-xl uppercase mb-2 text-red-500">Connection Failed</h3>
                  <p className="text-muted-foreground text-sm mb-6">{errorMessage}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-foreground text-background px-6 py-2 rounded font-heading font-bold text-sm tracking-widest hover:bg-foreground/90 transition-transform active:scale-95"
                  >
                    TRY AGAIN
                  </button>
                </motion.div>
              )}

              {walletState === "no-wallet" && (
                <motion.div
                  key="no-wallet"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center text-center py-8"
                >
                  <Wallet className="w-12 h-12 mb-6 text-foreground" />
                  <h3 className="font-heading font-bold text-xl uppercase mb-2">Phantom Required</h3>
                  <p className="text-muted-foreground text-sm mb-6">You need the Phantom wallet extension to play Solcraft.</p>
                  <a 
                    href="https://phantom.app/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-[#AB9FF2] text-white px-6 py-2 rounded font-heading font-bold text-sm tracking-widest hover:bg-[#978ae0] transition-transform active:scale-95 flex items-center gap-2"
                  >
                    INSTALL PHANTOM
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
