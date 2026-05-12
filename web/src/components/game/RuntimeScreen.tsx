"use client";

import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useMinetestConsole, usePrefetchData, useStorageManager } from '@/lib/minetest/GlobalContext';
import { fixGeometry as fixGeometryHelper } from '@/lib/minetest/helpers';
import PackManager from '@/lib/minetest/packManager';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = "https://api.solcraft.me";

export interface GameOptionsLocal {
  language: string; proxy: string; storagePolicy: string; minetestArgs: any;
  mode: 'local' | 'host' | 'join'; gameId: string; playerName?: string;
  password?: string; phantomWallet?: string;
}

interface RuntimeScreenProps {
  gameOptions: GameOptionsLocal;
  onGameStatus: (status: 'running' | 'failed') => void;
  zipLoaderPromise: Promise<any> | null;
}

declare global {
  interface Window {
    emloop_ready?: () => void; emloop_request_animation_frame?: () => void; Module: any;
    emloop_pause: any; emloop_unpause: any; emloop_init_sound: any; emloop_invoke_main: any;
    emloop_install_pack: any; emloop_set_minetest_conf: any; irrlicht_want_pointerlock: any;
    irrlicht_force_pointerlock: any; irrlicht_resize: any; emsocket_init: any;
    emsocket_set_proxy: any; emsocket_set_vpn: any;
    cwrap: (name: string, ret: string | null, args: string[]) => any;
    stringToNewUTF8: (text: string) => number; _malloc: (size: number) => number;
    _free: (ptr: number) => void; HEAPU8: Uint8Array; HEAPU32: Uint32Array;
  }
}

export function RuntimeScreen({ gameOptions, onGameStatus, zipLoaderPromise }: RuntimeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragConstraintsRef = useRef<HTMLDivElement>(null);

  const storageManager = useStorageManager();
  const prefetchData = usePrefetchData();
  const minetestConsole = useMinetestConsole();

  const [isLoading, setIsLoading] = useState(true);
  const [packManager] = useState(() => new PackManager(minetestConsole));
  const [isConnecting, setIsConnecting] = useState(true);
  const [displayProgress, setDisplayProgress] = useState(0);

  // NEUER STATE FÜR MENÜ STEUERUNG
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isWeb3MenuOpen, setIsWeb3MenuOpen] = useState(false);

  const scriptLoadedRef = useRef(false);

  // --- WEB3 STATE ---
  const [activeTab, setActiveTab] = useState<'Items' | 'NFTs'>('Items');
  const [inventory, setInventory] = useState<any[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState(1);
  const [isSending, setIsSending] = useState(false);

  const fetchAssets = useCallback(async () => {
    if (!gameOptions.phantomWallet) return;
    try {
      const invRes = await fetch(`${BACKEND_URL}/api/inventory/${gameOptions.phantomWallet}`);
      const invData = await invRes.json();
      if (invData.success && invData.data.web3_inventory) {
        const invArray = Object.entries(invData.data.web3_inventory)
          .map(([name, amount]) => ({ name, amount }))
          .filter(i => (i.amount as number) > 0);
        setInventory(invArray);
      }
      const nftRes = await fetch(`${BACKEND_URL}/api/nfts/${gameOptions.phantomWallet}`);
      const nftData = await nftRes.json();
      if (nftData.success && nftData.nfts) setNfts(nftData.nfts);
    } catch (e) { console.error("Failed to fetch assets", e); }
  }, [gameOptions.phantomWallet]);

  // Auto-Update alle 5 Sekunden, ABER nur wenn das Menü offen ist!
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWeb3MenuOpen) {
      fetchAssets();
      interval = setInterval(fetchAssets, 5000);
    } else {
      setShowSendModal(false);
      setSelectedAsset(null);
    }
    return () => clearInterval(interval);
  }, [isWeb3MenuOpen, fetchAssets]);

  // --- DIE NEUE, SAUBERE POINTER-LOCK LOGIK ---
  useEffect(() => {
    const onLockChange = () => {
      const locked = document.pointerLockElement === canvasRef.current;
      setIsPointerLocked(locked);

      if (locked) {
        setIsConnecting(false);
        setIsWeb3MenuOpen(false); // Menü schließen, wenn der Spieler ins Spiel klickt
      }
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, []);

  const fixGeometry = useCallback(() => {
    if (!canvasRef.current || !canvasContainerRef.current) return;
    fixGeometryHelper(canvasRef.current, canvasContainerRef.current, 'high', 'any');
  }, []);

  const makeArgv = useCallback((args: string[]) => {
    if (!window._malloc || !window.stringToNewUTF8) return [0, 0];
    const argv = window._malloc((args.length + 1) * 4);
    let i;
    for (i = 0; i < args.length; i++) window.HEAPU32[(argv >>> 2) + i] = window.stringToNewUTF8(args[i]);
    window.HEAPU32[(argv >>> 2) + i] = 0;
    return [i, argv];
  }, []);

  const launchGameRef = useRef<(() => Promise<void>) | null>(null);
  launchGameRef.current = async () => {
    try {
      if (!storageManager) throw new Error('StorageManager missing');
      if (!(await storageManager.isInitialized)) await storageManager.initialize({ policy: gameOptions.storagePolicy as any }, minetestConsole);
      if (zipLoaderPromise) await storageManager.restoreFromZip(await zipLoaderPromise);
      if (!storageManager.hasCopiedToModuleFS) await storageManager.copyToModuleFS();

      await packManager.addPack('base', prefetchData.result.base!);
      if (gameOptions.gameId === 'mineclone2') await packManager.addPack('voxelibre', prefetchData.result.voxelibre!);
      if (canvasRef.current) fixGeometry();

      const conf: Record<string, string> = {
        viewing_range: '140', language: gameOptions.language,
        keymap_inventory: 'KEY_KEY_E', show_nametag_backgrounds: 'false', show_entity_selectionbox: 'false',
      };
      if (window.emloop_set_minetest_conf && window.stringToNewUTF8) {
        const txt = Object.entries(conf).map(([k, v]) => `${k} = ${v}`).join('\n') + '\n';
        const ptr = window.stringToNewUTF8(txt);
        window.emloop_set_minetest_conf(ptr);
        window._free(ptr);
      }

      if (window.emloop_init_sound) window.emloop_init_sound();
      if (window.emsocket_init) window.emsocket_init();

      if (window.emsocket_set_proxy && window.stringToNewUTF8) {
        const p = window.stringToNewUTF8(gameOptions.proxy);
        window.emsocket_set_proxy(p);
        window._free(p);
      }

      const { minetestArgs } = gameOptions;
      if (minetestArgs.go && window.irrlicht_force_pointerlock) window.irrlicht_force_pointerlock();

      if (window.emloop_invoke_main) {
        const fullArgs = ['./minetest', ...minetestArgs.toArray()];
        const [argc, argv] = makeArgv(fullArgs);
        window.emloop_invoke_main(argc, argv);
        window.emloop_request_animation_frame?.();
        onGameStatus('running');
      }
    } catch (err) {
      setIsLoading(false);
      onGameStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  useLayoutEffect(() => {
    window.emloop_ready = () => {
      try {
        window.emloop_pause = window.cwrap('emloop_pause', null, []);
        window.emloop_unpause = window.cwrap('emloop_unpause', null, []);
        window.emloop_init_sound = window.cwrap('emloop_init_sound', null, []);
        window.emloop_invoke_main = window.cwrap('emloop_invoke_main', null, ['number', 'number']);
        window.emloop_install_pack = window.cwrap('emloop_install_pack', null, ['number', 'number', 'number']);
        window.emloop_set_minetest_conf = window.cwrap('emloop_set_minetest_conf', null, ['number']);
        window.irrlicht_want_pointerlock = window.cwrap('irrlicht_want_pointerlock', 'number', []);
        window.irrlicht_force_pointerlock = window.cwrap('irrlicht_force_pointerlock', null, []);
        window.irrlicht_resize = window.cwrap('irrlicht_resize', null, ['number', 'number']);
        window.emsocket_init = window.cwrap('emsocket_init', null, []);
        window.emsocket_set_proxy = window.cwrap('emsocket_set_proxy', null, ['number']);
        window.emsocket_set_vpn = window.cwrap('emsocket_set_vpn', null, ['number']);
        launchGameRef.current?.();
      } catch (e) {
        setIsLoading(false);
      }
    };
    window.emloop_request_animation_frame = () => {
      if (window.emloop_pause) window.emloop_pause();
      window.requestAnimationFrame(() => {
        if (window.emloop_unpause) window.emloop_unpause();
      });
    };
    return () => {
      delete window.emloop_ready;
      delete window.emloop_request_animation_frame;
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const workerInject = `
      Module['print'] = (text) => { postMessage({cmd:'callHandler',handler:'print',args:[text],threadId:Module['_pthread_self']()}); };
      Module['printErr'] = (text) => { postMessage({cmd:'callHandler',handler:'printErr',args:[text],threadId:Module['_pthread_self']()}); };
      importScripts('minetest.js');
    `;

    window.Module = {
      locateFile: (path: string) => `/minetest/${path}`,
      mainScriptUrlOrBlob: new Blob([workerInject], { type: 'text/javascript' }),
      preRun: [], postRun: [],
      print: (t: string) => minetestConsole.print(t),
      printErr: (t: string) => minetestConsole.printErr(t),
      canvas: canvasRef.current,
      onAbort: () => { onGameStatus('failed'); },
      totalDependencies: 0,
      monitorRunDependencies: (left: number) => {
        const deps = Math.max(window.Module.totalDependencies, left);
        window.Module.totalDependencies = deps;
        const pct = deps > 0 ? ((deps - left) / deps) * 100 : 0;
        window.dispatchEvent(new CustomEvent('minetest-progress', { detail: pct }));
      },
      onRuntimeInitialized: () => { minetestConsole.print('Runtime initialized.'); },
      onFileChange: (p: string) => storageManager?.fileChanged(p),
      onFileDelete: (p: string) => storageManager?.fileDeleted(p),
      onFullScreen: () => fixGeometry(),
    };

    const script = document.createElement('script');
    script.src = '/minetest/minetest.js';
    script.async = true;
    document.body.appendChild(script);

    const onResize = () => fixGeometry();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const h = (e: any) => setDisplayProgress(e.detail as number);
    window.addEventListener('minetest-progress', h);
    return () => window.removeEventListener('minetest-progress', h);
  }, []);

  const handleDragEnd = (event: any, info: any, asset: any) => {
    const dropZone = document.getElementById("send-drop-zone");
    if (dropZone) {
      const rect = dropZone.getBoundingClientRect();
      if (info.point.x >= rect.left && info.point.x <= rect.right &&
        info.point.y >= rect.top && info.point.y <= rect.bottom) {
        setSelectedAsset(asset);
        setSendAmount(1);
        setSendAddress('');
        setShowSendModal(true);
      }
    }
  };

  const equipSkin = async (skinId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/player/skin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phantom_wallet: gameOptions.phantomWallet, skin_id: skinId })
      });
      alert(`Skin ${skinId} ausgerüstet! Wird gleich im Spiel sichtbar.`);
    } catch (e) { console.error(e); }
  };

  const executeSend = async () => {
    if (!sendAddress) return;
    setIsSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_wallet: gameOptions.phantomWallet, to_wallet: sendAddress,
          asset_type: selectedAsset.type, asset_data: selectedAsset.data,
          amount: selectedAsset.type === 'item' ? sendAmount : 1
        })
      });
      const d = await res.json();
      if (d.success) {
        setShowSendModal(false);
        setSelectedAsset(null);
        await fetchAssets();
      } else alert("Transfer fehlgeschlagen: " + d.error);
    } catch (e) { alert("Transfer Fehler"); }
    setIsSending(false);
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center font-sans z-50">

      {/* LADEBILDCHIRM */}
      {isConnecting && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6">
          <Loader2 className="w-16 h-16 animate-spin text-foreground" />
          <h2 className="text-3xl font-bold font-heading">{isLoading ? 'Booting Engine...' : 'Connecting...'}</h2>
          {isLoading && (
            <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden mt-4 border border-border">
              <div className="h-full bg-foreground transition-all duration-75" style={{ width: `${displayProgress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* FLOATING BUTTON (Wird nur gezeigt, wenn Maus frei ist und Menü zu ist) */}
      {!isPointerLocked && !isConnecting && !isWeb3MenuOpen && (
        <div className="absolute top-6 right-6 z-40">
          <button
            onClick={() => setIsWeb3MenuOpen(true)}
            className="px-6 py-4 bg-primary text-primary-foreground font-heading font-bold rounded-2xl shadow-2xl hover:scale-105 transition-transform border border-border flex items-center gap-2 text-xl"
          >
            💎 Web3 Dashboard
          </button>
        </div>
      )}

      {/* WEB3 MENU MODAL */}
      <AnimatePresence>
        {isWeb3MenuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 md:p-12"
            onKeyDown={(e) => e.stopPropagation()} // WICHTIG: Tastendrücke hier drin ignorieren!
            onKeyUp={(e) => e.stopPropagation()}
          >
            {/* Käfig für Drag&Drop */}
            <div ref={dragConstraintsRef} className="absolute inset-0 pointer-events-none" />

            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[800px] flex overflow-hidden relative pointer-events-auto"
            >
              {/* LEFT SECTION */}
              <div className="flex-1 flex flex-col border-r border-border bg-secondary/20 relative">
                <div className="flex gap-8 p-6 border-b border-border bg-white/50 items-center">
                  <button onClick={() => setActiveTab('Items')} className={`text-2xl font-bold font-heading transition-colors ${activeTab === 'Items' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Web3 Items</button>
                  <button onClick={() => setActiveTab('NFTs')} className={`text-2xl font-bold font-heading transition-colors ${activeTab === 'NFTs' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>NFTs</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 relative">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-32">
                    {activeTab === 'Items' ? (
                      inventory.map((item: any, idx: number) => (
                        <motion.div
                          key={idx} drag dragConstraints={dragConstraintsRef} dragElastic={0.1}
                          whileDrag={{ scale: 1.05, zIndex: 50, rotate: 2 }}
                          onDragEnd={(e, info) => handleDragEnd(e, info, { type: 'item', data: item })}
                          className="bg-white border border-border rounded-3xl p-6 flex flex-col items-center justify-center gap-4 shadow-sm cursor-grab active:cursor-grabbing h-48 relative"
                        >
                          <div className="absolute top-4 right-4 bg-secondary text-foreground px-3 py-1 rounded-lg text-sm font-bold border border-border">x{item.amount}</div>
                          {/* DRAG FIX: pointerEvents none und draggable false */}
                          <img draggable={false} style={{ pointerEvents: 'none', userSelect: 'none' }} src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`} className="w-20 h-20 object-contain drop-shadow-sm" />
                          <span className="font-bold text-lg text-foreground text-center break-all">{item.name}</span>
                        </motion.div>
                      ))
                    ) : (
                      nfts.map((nft: any, idx: number) => (
                        <motion.div
                          key={idx} drag dragConstraints={dragConstraintsRef} dragElastic={0.1}
                          whileDrag={{ scale: 1.05, zIndex: 50, rotate: 2 }}
                          onDragEnd={(e, info) => handleDragEnd(e, info, { type: 'nft', data: nft })}
                          className="bg-secondary/50 border border-border rounded-3xl flex flex-col items-center justify-center shadow-sm cursor-grab active:cursor-grabbing h-48 overflow-hidden relative group"
                        >
                          {/* DRAG FIX */}
                          <img draggable={false} style={{ pointerEvents: 'none', userSelect: 'none' }} src={nft.image} className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110" />
                          <button onPointerDown={(e) => { e.stopPropagation(); equipSkin(nft.id); }} className="absolute bottom-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full z-10 cursor-pointer pointer-events-auto">
                            Equip
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Drop Zone */}
                <div id="send-drop-zone" className="absolute bottom-0 left-0 w-full h-32 bg-white/80 backdrop-blur-md border-t border-border flex flex-col items-center justify-center transition-colors shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                  <p className="text-muted-foreground font-bold font-heading text-xl tracking-widest uppercase pointer-events-none">⬇ Drag here to Send ⬇</p>
                </div>
              </div>

              {/* RIGHT SECTION: GAME MENU */}
              <div className="w-80 p-8 flex flex-col gap-4 bg-white/50 border-l border-border relative z-10">
                <h2 className="text-4xl font-heading font-bold mb-8 text-foreground drop-shadow-sm">Web3 Control</h2>
                <p className="text-sm text-muted-foreground mb-4">Click below to return to the game.</p>
                <button onClick={() => setIsWeb3MenuOpen(false)} className="py-5 bg-white border border-border shadow-sm text-foreground text-xl font-bold rounded-2xl hover:bg-secondary transition-all flex items-center justify-center gap-2">Close Dashboard</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={canvasContainerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', visibility: isConnecting ? 'hidden' : 'visible' }}>
        <canvas ref={canvasRef} id="canvas" className="emscripten" onContextMenu={e => e.preventDefault()} tabIndex={-1} />
      </div>
    </div>
  );
}