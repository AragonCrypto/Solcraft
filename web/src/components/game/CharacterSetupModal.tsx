"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield } from "lucide-react";

interface CharacterSetupModalProps {
  onMint: (name: string, mode: "Liquid" | "Manual") => void;
}

export function CharacterSetupModal({ onMint }: CharacterSetupModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"Liquid" | "Manual">("Liquid");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, "");
    setName(val);
    if (val.length > 0 && val.length < 3) {
      setError("Name must be at least 3 characters");
    } else if (val.toLowerCase() === "admin" || val.toLowerCase() === "server") {
      setError("This name is reserved!");
    } else {
      setError("");
    }
  };

  const handleSubmit = () => {
    if (name.length >= 3 && !error) {
      onMint(name, mode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-xl w-full max-w-lg"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-heading font-bold mb-2">Create Your Player</h2>
        <p className="text-muted-foreground">Mint your character to enter Solcraft.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Character Name</label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. SolanaKing"
            maxLength={20}
            className={`w-full bg-secondary/50 border ${
              error ? "border-red-500" : "border-border"
            } rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm mt-2"
            >
              {error}
            </motion.p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Game Mode</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode("Liquid")}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === "Liquid"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <Zap className="w-4 h-4 text-primary" /> Liquid
              </div>
              <p className="text-xs text-muted-foreground">
                0.1 SOL fee. Fully automated, instant on-chain transactions.
              </p>
            </button>
            <button
              onClick={() => setMode("Manual")}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === "Manual"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <Shield className="w-4 h-4 text-muted-foreground" /> Manual
              </div>
              <p className="text-xs text-muted-foreground">
                Free. Manual mints, max 1 action per hour.
              </p>
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={name.length < 3 || !!error}
          className="w-full py-4 mt-4 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mint Character <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
