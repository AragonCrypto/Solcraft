"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import QRCode from "react-qr-code";

// ⚠️ DEINE HETZNER SERVER IP HIER EINTRAGEN! (z.B. "http://116.203.126.146:4000")
const BACKEND_URL = "https://api.solcraft.me:4000";

interface PlayerDashboardModalProps {
  playerName: string;
  phantomWallet: string; // Der Public Key vom Phantom Wallet
  backendWallet: string; // Die auf dem Backend generierte Custodial Wallet
  isReady: boolean;
  displayProgress: number;
  onJoin: () => void;
}

export function PlayerDashboardModal({
  playerName,
  phantomWallet,
  backendWallet,
  isReady,
  displayProgress,
  onJoin,
}: PlayerDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<"Character" | "Inventory">("Character");
  const [isReloading, setIsReloading] = useState(false);

  // State für dynamische Daten aus dem Backend
  const [nfts, setNfts] = useState<any[]>([{ id: "default", name: "Default Skin", image: "/assets/skins/default.png" }]);
  const [skinIndex, setSkinIndex] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);

  // Zeige die Backend-Wallet an (nicht Phantom!)
  const shortAddress = backendWallet
    ? `${backendWallet.substring(0, 4)}...${backendWallet.substring(backendWallet.length - 4)}`
    : "Loading...";

  // 1. Lade Daten vom Backend
  const fetchData = async () => {
    setIsReloading(true);
    try {
      // NFTs / Skins laden
      const nftRes = await fetch(`${BACKEND_URL}/api/nfts/${phantomWallet}`);
      const nftData = await nftRes.json();
      if (nftData.success && nftData.nfts) {
        setNfts(nftData.nfts);
      }

      // Web3 Inventar laden
      const invRes = await fetch(`${BACKEND_URL}/api/inventory/${phantomWallet}`);
      const invData = await invRes.json();

      if (invData.success && invData.data.web3_inventory) {
        // Wandle das Objekt { "default:dirt": 5 } in ein Array für das Rendering um
        const invArray = Object.entries(invData.data.web3_inventory)
          .map(([key, val]) => ({ name: key, amount: val }))
          .filter(item => (item.amount as number) > 0);

        setInventory(invArray);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Backend-Daten:", err);
    }
    setIsReloading(false);
  };

  // Lade Daten beim ersten Öffnen
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phantomWallet]);

  // Skin wechseln
  const handleNextSkin = () => setSkinIndex((i) => (i + 1) % nfts.length);
  const handlePrevSkin = () => setSkinIndex((i) => (i - 1 + nfts.length) % nfts.length);

  // 2. Speichere den neuen Skin automatisch im Backend, wenn der Index sich ändert
  useEffect(() => {
    if (nfts.length > 0 && phantomWallet) {
      fetch(`${BACKEND_URL}/api/player/skin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phantom_wallet: phantomWallet,
          skin_id: nfts[skinIndex].id
        })
      }).catch(err => console.error("Konnte Skin nicht speichern:", err));
    }
  }, [skinIndex, nfts, phantomWallet]);

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
            className={`text-lg font-heading font-bold transition-colors ${activeTab === "Character" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Character
          </button>
          <button
            onClick={() => setActiveTab("Inventory")}
            className={`text-lg font-heading font-bold transition-colors ${activeTab === "Inventory" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Web3 Inventory
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
                    <img
                      src={nfts[skinIndex]?.image || ""}
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
                  <p className="text-sm text-primary mt-1 font-bold">Equipped: {nfts[skinIndex]?.name}</p>
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
                {inventory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p>Dein Web3 Inventar ist leer.</p>
                    <p className="text-sm mt-2">Baue im Spiel ab oder sende Tokens an deine Custodial Wallet.</p>
                  </div>
                ) : (
                  inventory.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg p-2 shadow-sm border border-border">
                          <img
                            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-bold">{item.name}</span>
                      </div>
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                        x{item.amount}
                      </div>
                    </div>
                  ))
                )}
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
          <h3 className="text-lg font-heading font-bold">Custodial Wallet</h3>
          <button
            onClick={fetchData}
            className={`p-2 text-muted-foreground hover:text-foreground transition-all ${isReloading ? "rotate-180" : ""}`}
            style={{ transitionDuration: "0.5s" }}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <p className="text-sm text-center text-muted-foreground mb-4">
            Send SPL tokens to this wallet to load them into the game automatically.
          </p>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-border mb-4">
            {backendWallet ? (
              <QRCode value={backendWallet} size={150} level="Q" />
            ) : (
              <div className="w-[150px] h-[150px] animate-pulse bg-secondary rounded-lg" />
            )}
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