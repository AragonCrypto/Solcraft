"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import QRCode from "react-qr-code";

interface PlayerDashboardModalProps {
  playerName: string;
  publicKey: string;
  isReady: boolean;
  displayProgress: number;
  onJoin: () => void;
}

const SKINS = ["/assets/skins/default.png", "/assets/skins/premium.png"];
const MOCK_INVENTORY = [
  { id: 1, name: "Solana Wood", amount: 24, image: "/assets/resources/tokens/wood.png" },
  { id: 2, name: "Iron Block", amount: 5, image: "/assets/resources/tokens/iron.png" },
  { id: 3, name: "SolCraft Pickaxe", amount: 1, image: "/assets/resources/tokens/pickaxe.png" },
];

export function PlayerDashboardModal({
  playerName,
  publicKey,
  isReady,
  displayProgress,
  onJoin,
}: PlayerDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<"Character" | "Inventory">("Character");
  const [skinIndex, setSkinIndex] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  const shortAddress = `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;
  
  const handleNextSkin = () => setSkinIndex((i) => (i + 1) % SKINS.length);
  const handlePrevSkin = () => setSkinIndex((i) => (i - 1 + SKINS.length) % SKINS.length);

  const handleReload = () => {
    setIsReloading(true);
    setTimeout(() => setIsReloading(false), 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white/90 backdrop-blur-2xl border border-border p-6 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row gap-6 min-h-[500px]"
    >
      {/* Left Section: Switchable Character/Inventory */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-4 mb-6 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("Character")}
            className={`text-lg font-heading font-bold transition-colors ${
              activeTab === "Character" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Character
          </button>
          <button
            onClick={() => setActiveTab("Inventory")}
            className={`text-lg font-heading font-bold transition-colors ${
              activeTab === "Inventory" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inventory
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "Character" ? (
              <motion.div
                key="character"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col items-center justify-center"
              >
                <div className="relative flex items-center justify-center mb-6">
                  <button
                    onClick={handlePrevSkin}
                    className="absolute left-0 -ml-12 p-2 bg-secondary rounded-full hover:bg-border transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="w-48 h-48 bg-secondary/50 rounded-2xl border border-border p-4 flex items-center justify-center overflow-hidden shadow-inner">
                    {/* Placeholder for actual image */}
                    <img
                      src={SKINS[skinIndex]}
                      alt="Player Skin"
                      className="w-full h-full object-contain drop-shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${playerName}&backgroundColor=transparent`;
                      }}
                    />
                  </div>
                  <button
                    onClick={handleNextSkin}
                    className="absolute right-0 -mr-12 p-2 bg-secondary rounded-full hover:bg-border transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-muted-foreground tracking-widest">PLAYER NAME</span>
                  <h3 className="text-2xl font-heading font-bold">{playerName}</h3>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full overflow-y-auto pr-4 space-y-3 custom-scrollbar"
              >
                {MOCK_INVENTORY.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg p-2 shadow-sm border border-border">
                         <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                             (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`;
                          }}
                        />
                      </div>
                      <span className="font-bold">{item.name}</span>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                      x{item.amount}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="hidden md:block w-px bg-border my-4" />

      {/* Right Section: Receive Assets & Loading */}
      <div className="md:w-[350px] flex flex-col">
        <div className="flex items-center justify-between mb-6 border-b border-border pb-2">
          <h3 className="text-lg font-heading font-bold">Receive Assets</h3>
          <button 
            onClick={handleReload}
            className={`p-2 text-muted-foreground hover:text-foreground transition-all ${isReloading ? "rotate-180" : ""}`}
            style={{ transitionDuration: "0.5s" }}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-border mb-4">
            <QRCode value={publicKey} size={150} level="Q" />
          </div>
          <div className="bg-secondary/50 px-4 py-2 rounded-full border border-border flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-sm">{shortAddress}</span>
          </div>
        </div>

        <div className="mt-auto">
          {!isReady ? (
            <button
              disabled
              className="w-full py-4 bg-secondary text-muted-foreground font-bold rounded-xl flex items-center justify-center gap-3 relative overflow-hidden"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading WebAssembly... {Math.round(displayProgress)}%</span>
              <div 
                className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300" 
                style={{ width: `${displayProgress}%` }}
              />
            </button>
          ) : (
            <button
              onClick={onJoin}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              Join Solcraft
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
