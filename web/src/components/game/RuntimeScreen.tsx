"use client";

import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useMinetestConsole, usePrefetchData, useStorageManager } from '@/lib/minetest/GlobalContext';
import { fixGeometry as fixGeometryHelper } from '@/lib/minetest/helpers';
import PackManager from '@/lib/minetest/packManager';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = "https://api.solcraft.me";

export interface GameOptionsLocal {
  language: string;
  proxy: string;
  storagePolicy: string;
  minetestArgs: any;
  mode: 'local' | 'host' | 'join';
  gameId: string;
  playerName?: string;
  password?: string;
  phantomWallet?: string;
}

interface RuntimeScreenProps {
  gameOptions: GameOptionsLocal;
  onGameStatus: (status: 'running' | 'failed') => void;
  zipLoaderPromise: Promise<any> | null;
}

declare global {
  interface Window {
    emloop_ready?: () => void;
    emloop_request_animation_frame?: () => void;
    Module: any;
    emloop_pause: any;
    emloop_unpause: any;
    emloop_init_sound: any;
    emloop_invoke_main: any;
    emloop_install_pack: any;
    emloop_set_minetest_conf: any;
    irrlicht_want_pointerlock: any;
    irrlicht_force_pointerlock: any;
    irrlicht_resize: any;
    emsocket_init: any;
    emsocket_set_proxy: any;
    emsocket_set_vpn: any;
    cwrap: (name: string, ret: string | null, args: string[]) => any;
    stringToNewUTF8: (text: string) => number;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    HEAPU8: Uint8Array;
    HEAPU32: Uint32Array;
  }
}

export function RuntimeScreen({ gameOptions, onGameStatus, zipLoaderPromise }: RuntimeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const storageManager = useStorageManager();
  const prefetchData = usePrefetchData();
  const minetestConsole = useMinetestConsole();

  const [isLoading, setIsLoading] = useState(true);
  const [packManager] = useState(() => new PackManager(minetestConsole));
  const [isConnecting, setIsConnecting] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Prevents double-load in React 18 Strict Mode
  const scriptLoadedRef = useRef(false);

  // --- PAUSE MENU STATE ---
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
      if (nftData.success && nftData.nfts) {
        setNfts(nftData.nfts);
      }
    } catch (e) { console.error("Failed to fetch assets", e); }
  }, [gameOptions.phantomWallet]);

  useEffect(() => {
    if (isPaused) {
      fetchAssets();
    } else {
      setShowSendModal(false);
      setSelectedAsset(null);
    }
  }, [isPaused, fetchAssets]);

  const fixGeometry = useCallback(() => {
    if (!canvasRef.current || !canvasContainerRef.current) return;
    fixGeometryHelper(canvasRef.current, canvasContainerRef.current, 'high', 'any');
  }, []);

  const makeArgv = useCallback((args: string[]) => {
    if (!window._malloc || !window.stringToNewUTF8) return [0, 0];
    const argv = window._malloc((args.length + 1) * 4);
    let i;
    for (i = 0; i < args.length; i++) {
      window.HEAPU32[(argv >>> 2) + i] = window.stringToNewUTF8(args[i]);
    }
    window.HEAPU32[(argv >>> 2) + i] = 0;
    return [i, argv];
  }, []);

  const launchGameRef = useRef<(() => Promise<void>) | null>(null);
  launchGameRef.current = async () => {
    try {
      if (!storageManager) throw new Error('StorageManager missing');
      if (!(await storageManager.isInitialized)) {
        await storageManager.initialize({ policy: gameOptions.storagePolicy as any }, minetestConsole);
      }
      if (zipLoaderPromise) {
        await storageManager.restoreFromZip(await zipLoaderPromise);
      }
      if (!storageManager.hasCopiedToModuleFS) {
        await storageManager.copyToModuleFS();
      }
      minetestConsole.print('Installing packs...');
      await packManager.addPack('base', prefetchData.result.base!);
      if (gameOptions.gameId === 'mineclone2') {
        await packManager.addPack('voxelibre', prefetchData.result.voxelibre!);
      }
      if (canvasRef.current) fixGeometry();

      const conf: Record<string, string> = {
        viewing_range: '140', max_block_send_distance: '10',
        max_block_generate_distance: '10', client_mapblock_limit: '8000',
        no_mtg_notification: 'true', language: gameOptions.language,
        keymap_inventory: 'KEY_KEY_E', keymap_noclip: '', keymap_fastmove: '',
        keymap_freemove: '', keymap_mute: '', keymap_minimap: '', keymap_console: '',
        keymap_chat: '', keymap_cmd_local: '', keymap_toggle_debug: '',
        keymap_toggle_chat: '', keymap_toggle_profiler: '', keymap_zoom: '',
        show_nametag_backgrounds: 'false', show_entity_selectionbox: 'false',
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
      if (minetestArgs.go && window.irrlicht_force_pointerlock) {
        window.irrlicht_force_pointerlock();
      }

      if (window.emloop_invoke_main) {
        const fullArgs = ['./minetest', ...minetestArgs.toArray()];
        minetestConsole.print('Starting: ' + fullArgs.join(' '));
        const [argc, argv] = makeArgv(fullArgs);
        window.emloop_invoke_main(argc, argv);
        window.emloop_request_animation_frame?.();
        onGameStatus('running');
      }
    } catch (err) {
      minetestConsole.printErr(`Launch error: ${err}`);
      setIsLoading(false);
      onGameStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  useLayoutEffect(() => {
    window.emloop_ready = () => {
      minetestConsole.print('emloop_ready called — wrapping C functions...');
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
        minetestConsole.print('C functions wrapped. Launching game...');
        launchGameRef.current?.();
      } catch (e) {
        minetestConsole.printErr(`emloop_ready error: ${e}`);
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

    const canvas = canvasRef.current;
    const workerInject = `
      Module['print'] = (text) => {
        postMessage({cmd:'callHandler',handler:'print',args:[text],threadId:Module['_pthread_self']()});
      };
      Module['printErr'] = (text) => {
        postMessage({cmd:'callHandler',handler:'printErr',args:[text],threadId:Module['_pthread_self']()});
      };
      importScripts('minetest.js');
    `;

    window.Module = {
      locateFile: (path: string) => `/minetest/${path}`,
      mainScriptUrlOrBlob: new Blob([workerInject], { type: 'text/javascript' }),
      preRun: [],
      postRun: [],
      print: (t: string) => minetestConsole.print(t),
      printErr: (t: string) => minetestConsole.printErr(t),
      canvas,
      onAbort: () => { minetestConsole.printErr('WASM aborted'); onGameStatus('failed'); },
      totalDependencies: 0,
      monitorRunDependencies: (left: number) => {
        const deps = Math.max(window.Module.totalDependencies, left);
        window.Module.totalDependencies = deps;
        const pct = deps > 0 ? ((deps - left) / deps) * 100 : 0;
        window.dispatchEvent(new CustomEvent('minetest-progress', { detail: pct }));
      },
      setStatus: (_: string) => { },
      onRuntimeInitialized: () => { minetestConsole.print('Runtime initialized.'); },
      onFileChange: (p: string) => storageManager?.fileChanged(p),
      onFileDelete: (p: string) => storageManager?.fileDeleted(p),
      onFullScreen: () => fixGeometry(),
    };

    const script = document.createElement('script');
    script.src = '/minetest/minetest.js';
    script.async = true;
    script.onerror = () => { minetestConsole.printErr('Failed to load minetest.js'); onGameStatus('failed'); };
    script.onload = () => { minetestConsole.print('minetest.js loaded.'); };
    document.body.appendChild(script);

    const onResize = () => fixGeometry();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: any) => setDisplayProgress(e.detail as number);
    window.addEventListener('minetest-progress', h);
    return () => window.removeEventListener('minetest-progress', h);
  }, []);

  useEffect(() => {
    if (storageManager) storageManager.setMinetestConsole(minetestConsole);
  }, [storageManager, minetestConsole]);

  // --- START ESC & FOCUS FIX ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Wenn wir im Spiel sind und ESC drücken: Verhindere, dass das Spiel ESC registriert!
      if (e.code === 'Escape' && document.pointerLockElement === canvasRef.current) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        document.exitPointerLock(); // Nur Browser-Pointer-Lock beenden, Menü öffnen
      }
    };

    // Wir greifen die Tasten in der "Capture"-Phase ab, bevor das Canvas sie bekommt
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);

    const onLockChange = () => {
      if (document.pointerLockElement === canvasRef.current) {
        setIsConnecting(false);
        setIsPaused(false);
        canvasRef.current?.focus(); // Spiel bekommt Fokus zurück
      } else {
        if (isConnecting) return;
        setIsPaused(true);
        canvasRef.current?.blur(); // SPIEL WIRD BLIND FÜR TASTATUR
      }
    };
    document.addEventListener('pointerlockchange', onLockChange);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [isConnecting]);
  // --- ENDE ESC & FOCUS FIX ---

  useEffect(() => {
    if (!isConnecting) return;
    const t = setTimeout(() => {
      minetestConsole.printErr('Connection timeout — reloading.');
      window.location.reload();
    }, 60_000);
    return () => clearTimeout(t);
  }, [isConnecting]);



  const handleResume = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (_) { }
    canvasRef.current?.requestPointerLock();
  };

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

  const executeSend = async () => {
    if (!sendAddress) return;
    setIsSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_wallet: gameOptions.phantomWallet,
          to_wallet: sendAddress,
          asset_type: selectedAsset.type,
          asset_data: selectedAsset.data,
          amount: selectedAsset.type === 'item' ? sendAmount : 1
        })
      });
      const d = await res.json();
      if (d.success) {
        setShowSendModal(false);
        setSelectedAsset(null);
        await fetchAssets();
      } else {
        alert("Transfer failed: " + d.error);
      }
    } catch (e) {
      console.error(e);
      alert("Transfer error");
    }
    setIsSending(false);
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center font-sans z-50">

      {isConnecting && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6">
          <Loader2 className="w-16 h-16 animate-spin text-foreground" />
          <h2 className="text-3xl font-bold font-heading">
            {isLoading ? 'Booting WebAssembly Engine...' : 'Connecting to Solcraft...'}
          </h2>
          <p className="text-muted-foreground">Securing connection and loading world data</p>
          {isLoading && (
            <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden mt-4 border border-border">
              <div
                className="h-full bg-foreground transition-all duration-75"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {isPaused && !isConnecting && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 md:p-12"
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[800px] flex overflow-hidden relative"
          >
            {/* LEFT SECTION: WEB3 DASHBOARD */}
            <div className="flex-1 flex flex-col border-r border-border bg-secondary/20 relative">
              {/* Tabs */}
              <div className="flex gap-8 p-6 border-b border-border bg-white/50 items-center">
                <button
                  onClick={() => setActiveTab('Items')}
                  className={`text-2xl font-bold font-heading transition-colors ${activeTab === 'Items' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Web3 Items
                </button>
                <button
                  onClick={() => setActiveTab('NFTs')}
                  className={`text-2xl font-bold font-heading transition-colors ${activeTab === 'NFTs' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  NFTs
                </button>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6 relative">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-32">
                  {activeTab === 'Items' ? (
                    inventory.map((item: any, idx: number) => (
                      <motion.div
                        key={idx}
                        drag
                        dragSnapToOrigin
                        whileDrag={{ scale: 1.05, zIndex: 50, rotate: 2 }}
                        onDragEnd={(e, info) => handleDragEnd(e, info, { type: 'item', data: item })}
                        className="bg-white border border-border rounded-3xl p-6 flex flex-col items-center justify-center gap-4 shadow-sm cursor-grab active:cursor-grabbing h-48 relative"
                      >
                        <div className="absolute top-4 right-4 bg-secondary text-foreground px-3 py-1 rounded-lg text-sm font-bold border border-border">
                          x{item.amount}
                        </div>
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`} className="w-20 h-20 object-contain drop-shadow-sm" />
                        <span className="font-bold text-lg text-foreground text-center break-all">{item.name}</span>
                      </motion.div>
                    ))
                  ) : (
                    nfts.map((nft: any, idx: number) => (
                      <motion.div
                        key={idx}
                        drag
                        dragSnapToOrigin
                        whileDrag={{ scale: 1.05, zIndex: 50, rotate: 2 }}
                        onDragEnd={(e, info) => handleDragEnd(e, info, { type: 'nft', data: nft })}
                        className="bg-secondary/50 border border-border rounded-3xl flex items-center justify-center shadow-sm cursor-grab active:cursor-grabbing h-48 overflow-hidden relative group"
                      >
                        <img src={nft.image} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      </motion.div>
                    ))
                  )}

                  {(activeTab === 'Items' && inventory.length === 0) || (activeTab === 'NFTs' && nfts.length === 0) ? (
                    <div className="col-span-full text-center text-muted-foreground mt-12 text-lg font-medium">
                      Inventory is empty.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Drop Zone */}
              <div id="send-drop-zone" className="absolute bottom-0 left-0 w-full h-32 bg-white/80 backdrop-blur-md border-t border-border flex flex-col items-center justify-center transition-colors shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <p className="text-muted-foreground font-bold font-heading text-xl tracking-widest uppercase">⬇ Drag here to Send ⬇</p>
              </div>

              {/* Send Modal Overlay */}
              <AnimatePresence>
                {showSendModal && selectedAsset && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex items-center justify-center p-8"
                  >
                    <div className="bg-white border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col gap-6">
                      <h3 className="text-3xl font-heading font-bold text-foreground">Send {selectedAsset.type === 'item' ? 'Item' : 'NFT'}</h3>

                      <div className="flex items-center gap-6 p-4 bg-secondary/30 border border-border rounded-2xl">
                        {selectedAsset.type === 'item' ? (
                          <>
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-border">
                              <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${selectedAsset.data.name}`} className="w-16 h-16" />
                            </div>
                            <div className="font-bold text-xl">{selectedAsset.data.name}</div>
                          </>
                        ) : (
                          <>
                            <img src={selectedAsset.data.image} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
                            <div className="font-bold text-xl">Selected NFT</div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">To Solana Wallet</label>
                        <input type="text" className="p-4 bg-secondary border border-border rounded-xl text-foreground font-mono outline-none focus:border-foreground transition-colors" placeholder="Solana Address..." value={sendAddress} onChange={e => setSendAddress(e.target.value)} />
                      </div>

                      {selectedAsset.type === 'item' && (
                        <div className="flex flex-col gap-3">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Amount (Max: {selectedAsset.data.amount})</label>
                          <input type="number" min="1" max={selectedAsset.data.amount} className="p-4 bg-secondary border border-border rounded-xl text-foreground font-mono outline-none focus:border-foreground transition-colors" value={sendAmount} onChange={e => setSendAmount(Number(e.target.value))} />
                        </div>
                      )}

                      <div className="flex gap-4 mt-4">
                        <button onClick={() => setShowSendModal(false)} className="flex-1 py-4 bg-secondary border border-border rounded-xl font-bold text-foreground hover:bg-border transition-all">Cancel</button>
                        <button onClick={executeSend} disabled={isSending || !sendAddress} className="flex-1 py-4 bg-white border border-border shadow-sm text-foreground rounded-xl font-bold hover:bg-secondary transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Items"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT SECTION: GAME MENU */}
            <div className="w-80 p-8 flex flex-col gap-4 bg-white/50 border-l border-border relative z-10">
              <h2 className="text-4xl font-heading font-bold mb-8 text-foreground drop-shadow-sm">Paused</h2>

              <button onClick={handleResume} className="py-5 bg-white border border-border shadow-sm text-foreground text-xl font-bold rounded-2xl hover:bg-secondary transition-all flex items-center justify-center gap-2">Continue</button>
              <button className="py-5 bg-white border border-border shadow-sm text-foreground text-xl font-bold rounded-2xl hover:bg-secondary transition-all flex items-center justify-center gap-2">Settings</button>

              <div className="mt-auto">
                <button onClick={() => window.location.reload()} className="w-full py-5 bg-white border border-border shadow-sm text-foreground text-xl font-bold rounded-2xl hover:bg-secondary transition-all flex items-center justify-center gap-2">Quit Game</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div
        ref={canvasContainerRef}
        style={{ width: '100vw', height: '100vh', overflow: 'hidden', visibility: isConnecting ? 'hidden' : 'visible' }}
      >
        <canvas
          ref={canvasRef}
          id="canvas"
          className="emscripten"
          onContextMenu={e => e.preventDefault()}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}