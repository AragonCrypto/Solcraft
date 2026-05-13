"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Copy, Check, ExternalLink, ListFilter, SlidersHorizontal } from "lucide-react";
import QRCode from "react-qr-code";

// Dynamically import SkinViewer component to avoid SSR issues
const SkinViewer3D = ({ skinUrl, onLoaded }: { skinUrl: string; onLoaded: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewer, setViewer] = useState<any>(null);

  useEffect(() => {
    let sv: any;
    
    const initViewer = async () => {
      const { SkinViewer, WalkingAnimation } = await import("skinview3d");
      
      if (!canvasRef.current) return;

      sv = new SkinViewer({
        canvas: canvasRef.current,
        width: 200,
        height: 200,
      });

      // Adjust camera to fit the model better and center it
      sv.camera.position.set(0, 10, 60);
      sv.zoom = 0.8; // Zoom out slightly to make model smaller

      sv.animation = new WalkingAnimation();
      sv.animation.speed = 0.6;
      sv.controls.enableRotate = true;
      sv.controls.enableZoom = false;
      sv.autoRotate = true;
      sv.autoRotateSpeed = 0.5;
      
      // Initial load
      await sv.loadSkin(skinUrl);
      onLoaded();
      setViewer(sv);
    };

    initViewer();

    return () => {
      if (sv) sv.dispose();
    };
  }, []);

  useEffect(() => {
    if (viewer && skinUrl) {
      viewer.loadSkin(skinUrl).then(() => onLoaded());
    }
  }, [viewer, skinUrl, onLoaded]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="cursor-grab active:cursor-grabbing transition-opacity duration-700" 
        style={{ 
          imageRendering: 'pixelated',
          width: '100%',
          height: '100%',
          maxWidth: '180px',
          maxHeight: '180px'
        }}
      />
    </div>
  );
};

// ⚠️ DEINE HETZNER SERVER IP HIER EINTRAGEN! (z.B. "http://116.203.126.146:4000")
const BACKEND_URL = "https://api.solcraft.me";

const formatItemName = (name: string) => {
  if (!name) return "";
  const baseName = name.includes(':') ? name.split(':')[1] : name;
  return baseName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [skinLoaded, setSkinLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<"amount" | "worth">("amount");
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Sell Interaction States
  const [solBalance, setSolBalance] = useState(1.42);
  const [sellingItemName, setSellingItemName] = useState<string | null>(null);
  const [sellAmount, setSellAmount] = useState(1);
  const [hoveringWorthIndex, setHoveringWorthIndex] = useState<number | null>(null);

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
    if (isRefreshing) return;
    setIsRefreshing(true);
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
        const invArray = Object.entries(invData.data.web3_inventory)
          .map(([key, val]) => {
            const amount = val as number;
            // Mock worth: randomly assign a value to some items for demonstration
            const mockWorth = Math.random() > 0.5 ? (amount * (Math.random() * 5 + 0.5)).toFixed(2) : "0.00";
            return { name: key, amount, worth: mockWorth };
          })
          .filter(item => item.amount > 0);

        setInventory(invArray);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Backend-Daten:", err);
    }
    setIsReloading(false);
    setRefreshRotation(prev => prev + 720);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const copyToClipboard = () => {
    if (!backendWallet) return;
    navigator.clipboard.writeText(backendWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lade Daten beim ersten Öffnen
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phantomWallet]);

  // Skin wechseln
  const handleNextSkin = () => {
    setSkinLoaded(false);
    setSkinIndex((i) => (i + 1) % nfts.length);
  };
  const handlePrevSkin = () => {
    setSkinLoaded(false);
    setSkinIndex((i) => (i - 1 + nfts.length) % nfts.length);
  };

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

  // Calculate total worth of all items
  const totalWorth = React.useMemo(() => {
    const solPrice = 173.59; // Mock price per SOL
    const solWorth = solBalance * solPrice;
    const itemsWorth = inventory.reduce((acc, item) => acc + parseFloat(item.worth || "0"), 0);
    return (solWorth + itemsWorth).toFixed(2);
  }, [inventory, solBalance]);

  const handleSell = (item: any, amountToSell: number) => {
    // 1. Calculate value gain
    const itemUnitPrice = parseFloat(item.worth) / item.amount;
    const gain = itemUnitPrice * amountToSell;
    const solGain = gain / 173.59; // Convert gain to SOL

    // 2. Update SOL balance
    setSolBalance(prev => prev + solGain);

    // 3. Update Inventory
    setInventory(prev => {
      return prev.map(i => {
        if (i.name === item.name) {
          return { ...i, amount: i.amount - amountToSell, worth: (parseFloat(i.worth) - gain).toFixed(2) };
        }
        return i;
      }).filter(i => i.amount > 0);
    });

    // 4. Reset selling state
    setSellingItemName(null);
    setSellAmount(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white/90 backdrop-blur-2xl border border-border p-6 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row gap-6 h-[75svh] max-h-[600px] overflow-hidden"
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
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setActiveTab("Inventory")}
              className={`text-lg font-heading font-bold transition-colors ${activeTab === "Inventory" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Web3 Inventory
            </button>
            
            <AnimatePresence>
              {activeTab === "Inventory" && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="relative flex items-center"
                  onMouseEnter={() => setIsSortOpen(true)}
                  onMouseLeave={() => setIsSortOpen(false)}
                >
                  <motion.div
                    layout
                    className="flex items-center gap-1 bg-secondary/50 border border-border/50 p-1 rounded-full overflow-hidden"
                    style={{ borderRadius: 999 }}
                  >
                    <AnimatePresence mode="popLayout">
                      {!isSortOpen ? (
                        <motion.button
                          key="active"
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          {sortBy === "amount" ? "Quantity" : "Worth"}
                        </motion.button>
                      ) : (
                        <motion.div
                          key="options"
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1"
                        >
                          <button 
                            onClick={() => setSortBy("amount")}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === "amount" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Quantity
                          </button>
                          <button 
                            onClick={() => setSortBy("worth")}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === "worth" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Worth
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
                <div className="text-center mb-8">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">Player Profile</span>
                  <h3 className="text-3xl font-heading font-bold text-foreground mt-1">{playerName}</h3>
                </div>

                <div className="relative flex items-center justify-center mb-6">
                  <button
                    onClick={handlePrevSkin}
                    className="absolute left-0 -ml-12 p-2 bg-secondary/50 rounded-full hover:bg-border transition-colors group"
                  >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                  <div className="w-48 h-48 bg-secondary/30 rounded-3xl border border-border/50 p-4 flex items-center justify-center overflow-hidden shadow-inner relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {!skinLoaded && (
                      <div className="absolute inset-0 animate-shimmer" />
                    )}

                    <div className={`relative z-10 w-full h-full transition-all duration-700 ${skinLoaded ? 'opacity-100 scale-105' : 'opacity-0 scale-95'}`}>
                      <SkinViewer3D 
                        skinUrl={nfts[skinIndex]?.image || ""} 
                        onLoaded={() => setSkinLoaded(true)} 
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleNextSkin}
                    className="absolute right-0 -mr-12 p-2 bg-secondary/50 rounded-full hover:bg-border transition-colors group"
                  >
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">Equipped Skin</span>
                  </div>
                  
                  <motion.a 
                    href="https://solscan.io" 
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover="hover"
                    initial="initial"
                    className="group relative bg-secondary/40 px-4 py-2.5 rounded-full border border-border flex items-center gap-3 transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{nfts[skinIndex]?.name}</span>
                    
                    <motion.div
                      variants={{
                        initial: { width: 0, opacity: 0 },
                        hover: { width: "auto", opacity: 1 }
                      }}
                      className="flex items-center"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </motion.div>
                    
                    <motion.div 
                      variants={{
                        initial: { opacity: 0 },
                        hover: { opacity: 1 }
                      }}
                      className="absolute inset-0 bg-foreground/[0.05] pointer-events-none transition-opacity" 
                    />
                  </motion.a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                {inventory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p>Your Web3 inventory is empty.</p>
                    <p className="text-sm mt-2">Mine blocks in the game or send items to your Custodial Wallet.</p>
                  </div>
                ) : (
                  <>
                    {/* FIXED: Featured Item: Solana */}
                    <div className="pb-4 pr-4">
                      <div className="flex items-stretch bg-primary/5 border border-primary/20 rounded-xl overflow-hidden group shadow-sm ring-1 ring-primary/5">
                        <div className="flex-1 flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg p-1.5 shadow-sm border border-primary/10">
                              <img
                                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                alt="Solana"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-foreground">Solana</span>
                              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Main Currency</span>
                            </div>
                          </div>
                          <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-xs font-bold border border-primary/20">
                            {solBalance.toFixed(2)} SOL
                          </div>
                        </div>
                        
                        <div className="w-px bg-primary/20 my-3" />
                        
                        <div className="w-24 bg-primary/5 flex items-center justify-center p-2">
                          <div className="w-full h-full rounded-lg flex items-center justify-center bg-primary border border-primary shadow-sm text-white">
                            <span className="text-sm font-bold tracking-tight">
                              ${(solBalance * 173.59).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-border/40 mx-2 mt-4" />
                    </div>

                    {/* SCROLLABLE: Other Items */}
                    <div className="flex-1 overflow-y-auto pr-4 space-y-3 custom-scrollbar pb-2">
                      {[...inventory]
                        .sort((a, b) => {
                          if (sortBy === "amount") return b.amount - a.amount;
                          return parseFloat(b.worth) - parseFloat(a.worth);
                        })
                        .map((item, idx) => (
                    <motion.div 
                      layout
                      key={item.name} 
                      initial={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, x: -50 }}
                      className="flex items-stretch bg-secondary/30 border border-border rounded-xl overflow-hidden group shadow-sm h-16"
                    >
                      <div className="flex-1 flex items-center justify-between p-3 relative overflow-hidden h-full">
                        <AnimatePresence mode="popLayout">
                          {sellingItemName === item.name ? (
                            <motion.div 
                              key="sell-mode"
                              initial={{ y: -50, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: 50, opacity: 0 }}
                              transition={{ type: "spring", damping: 15, stiffness: 250 }}
                              className="absolute inset-0 flex items-center px-4 gap-4 bg-primary/5"
                            >
                              <div className="flex-1 relative h-6 flex items-center">
                                <div className="absolute inset-0 bg-primary/10 rounded-full h-1.5 my-auto" />
                                <motion.div 
                                  className="absolute inset-y-0 left-0 bg-primary rounded-full h-1.5 my-auto"
                                  style={{ width: `${(sellAmount / item.amount) * 100}%` }}
                                />
                                <input 
                                  type="range"
                                  min="0"
                                  max={item.amount}
                                  value={sellAmount}
                                  onChange={(e) => setSellAmount(parseInt(e.target.value))}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <motion.div 
                                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md pointer-events-none z-0"
                                  animate={{ left: `${(sellAmount / item.amount) * 100}%` }}
                                  style={{ marginLeft: '-8px' }}
                                  transition={{ duration: 0 }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">
                                Sell {sellAmount}
                              </span>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="normal-mode"
                              initial={{ y: 0, opacity: 1 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: 50, opacity: 0 }}
                              transition={{ type: "spring", damping: 15, stiffness: 250 }}
                              className="flex-1 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg p-1.5 shadow-sm border border-border/50">
                                  <img
                                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <span className="font-bold text-sm text-foreground/90">{formatItemName(item.name)}</span>
                              </div>
                              <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg text-xs font-bold border border-primary/20">
                                x{item.amount}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div className="w-px bg-border/40 my-3" />
                      
                      <button 
                        className="w-24 bg-secondary/30 flex items-center justify-center p-2 group/worth cursor-pointer relative overflow-hidden"
                        onMouseEnter={() => setHoveringWorthIndex(idx)}
                        onMouseLeave={() => setHoveringWorthIndex(null)}
                        onClick={() => {
                          if (parseFloat(item.worth) <= 0) return;
                          if (sellingItemName === item.name) {
                            if (sellAmount === 0) {
                              setSellingItemName(null);
                            } else {
                              handleSell(item, sellAmount);
                            }
                          } else {
                            if (item.amount === 1) {
                              handleSell(item, 1);
                            } else {
                              setSellingItemName(item.name);
                              setSellAmount(0);
                            }
                          }
                        }}
                      >
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-full h-full rounded-lg flex items-center justify-center border shadow-sm transition-all duration-300 ${
                            sellingItemName === item.name && sellAmount === 0
                              ? "bg-white border-border text-primary"
                              : parseFloat(item.worth) > 0 
                                ? "bg-primary border-primary text-white" 
                                : "bg-white border-border/50 text-muted-foreground"
                          }`}
                        >
                          <span className="text-sm font-bold tracking-tight">
                            {sellingItemName === item.name 
                              ? (sellAmount === 0 ? "Cancel" : "Confirm") 
                              : `$${item.worth}`}
                          </span>
                        </motion.div>

                        <AnimatePresence>
                          {hoveringWorthIndex === idx && sellingItemName !== item.name && parseFloat(item.worth) > 0 && (
                            <motion.div
                              initial={{ x: '100%' }}
                              animate={{ x: 0 }}
                              exit={{ x: '100%' }}
                              transition={{ delay: 0.1, type: "spring", damping: 20, stiffness: 200 }}
                              className="absolute inset-0 bg-white flex items-center justify-center z-10"
                            >
                              <span className="text-primary font-bold text-xs uppercase tracking-widest">Sell</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                    ))}
                    </div>
                  </>
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
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-heading font-bold">Custodial Wallet</h3>
            <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-2xl text-sm font-bold border border-primary/20 shadow-sm">
              ${totalWorth}
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <motion.div
              animate={{ rotate: refreshRotation }}
              transition={{ duration: 1, ease: "easeInOut" }}
            >
              <RefreshCw className="w-5 h-5" />
            </motion.div>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <p className="text-xs text-center text-muted-foreground mb-4 leading-relaxed">
            Send SPL tokens and NFTs to this wallet to load them into the game automatically.
          </p>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-border mb-4">
            {backendWallet ? (
              <QRCode value={backendWallet} size={150} level="Q" />
            ) : (
              <div className="w-[150px] h-[150px] animate-pulse bg-secondary rounded-lg" />
            )}
          </div>
          <motion.button 
            onClick={copyToClipboard}
            whileHover="hover"
            initial="initial"
            className="group relative bg-secondary/40 px-4 py-2.5 rounded-full border border-border flex items-center gap-3 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <span className="font-mono text-xs text-foreground/80 group-hover:text-foreground transition-colors whitespace-nowrap">{shortAddress}</span>
            
            <motion.div
              variants={{
                initial: { width: 0, opacity: 0, marginLeft: 0 },
                hover: { width: "auto", opacity: 1, marginLeft: 4 }
              }}
              className="flex items-center"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.div 
              variants={{
                initial: { opacity: 0 },
                hover: { opacity: 1 }
              }}
              className="absolute inset-0 bg-foreground/[0.05] pointer-events-none transition-opacity" 
            />
          </motion.button>
        </div>

        <div className="mt-auto">
          {!isReady ? (
            <button
              disabled
              className="w-full py-4 bg-secondary text-muted-foreground font-bold rounded-xl flex items-center justify-center gap-3 relative overflow-hidden"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading</span>
              <div
                className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300"
                style={{ width: `${displayProgress}%` }}
              />
            </button>
          ) : (
            <button
              onClick={onJoin}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Join Solcraft
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}