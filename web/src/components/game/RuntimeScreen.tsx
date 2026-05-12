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

function PauseMenu({ playerName, onResume, onDisconnect }: { playerName: string, onResume: () => void, onDisconnect: () => void }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [stagedItem, setStagedItem] = useState<any | null>(null);
  const [targetWallet, setTargetWallet] = useState("");
  const [sendAmount, setSendAmount] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playerName) return;
    fetch(`${BACKEND_URL}/api/inventory-by-name/${playerName}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const invArray = Object.entries(data.inventory || {})
            .map(([key, val]) => ({ type: 'item', id: key, name: key, amount: val }))
            .filter(item => (item.amount as number) > 0);
          setInventory(invArray);

          if (data.wallet) {
            fetch(`${BACKEND_URL}/api/nfts/${data.wallet}`)
              .then(r => r.json())
              .then(nftData => {
                if (nftData.success && nftData.nfts) {
                  const nftArr = nftData.nfts.map((n: any) => ({ type: 'nft', id: n.id, image: n.image, amount: 1 }));
                  setNfts(nftArr);
                }
              })
              .catch(console.error);
          }
        }
      })
      .catch(console.error);
  }, [playerName]);

  const items = [...nfts, ...inventory];

  const handleDragEnd = (event: any, info: any, item: any) => {
    if (!dropZoneRef.current) return;
    const rect = dropZoneRef.current.getBoundingClientRect();
    if (
      info.point.x >= rect.left &&
      info.point.x <= rect.right &&
      info.point.y >= rect.top &&
      info.point.y <= rect.bottom
    ) {
      setStagedItem(item);
      setSendAmount(1);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: playerName,
          target_wallet: targetWallet,
          item_type: stagedItem.type,
          item_id: stagedItem.id,
          amount: stagedItem.type === 'item' ? sendAmount : 1
        })
      });
      const data = await res.json();
      if (data.success) {
        if (stagedItem.type === 'item') {
          setInventory(inv => inv.map(i => i.id === stagedItem.id ? { ...i, amount: i.amount - sendAmount } : i).filter(i => i.amount > 0));
        } else {
          setNfts(n => n.filter(i => i.id !== stagedItem.id));
        }
        setStagedItem(null);
        setTargetWallet("");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error sending");
    }
    setIsSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-center justify-center p-8 pointer-events-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white/95 border border-border p-8 rounded-3xl shadow-2xl w-full max-w-7xl flex gap-10 h-[85vh] relative overflow-hidden text-foreground"
      >
        <div className="flex-1 flex flex-col gap-6 border-r border-border pr-10 overflow-hidden">
          <h2 className="text-3xl font-heading font-bold">Web3 Inventory</h2>

          <div className="flex-1 overflow-y-auto pr-4 grid grid-cols-3 md:grid-cols-4 gap-4 auto-rows-max custom-scrollbar pb-4 relative">
            {items.length === 0 ? (
              <div className="col-span-full flex items-center justify-center h-40 text-muted-foreground font-medium">
                Your inventory is empty.
              </div>
            ) : items.map(item => (
              <motion.div
                key={item.type + item.id}
                drag
                dragSnapToOrigin
                onDragEnd={(e, info) => handleDragEnd(e, info, item)}
                whileHover={{ scale: 1.05 }}
                whileDrag={{ scale: 1.1, zIndex: 50, rotate: 4 }}
                className="relative bg-secondary/30 border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing hover:bg-secondary/50 transition-colors aspect-square shadow-sm"
              >
                {item.type === 'nft' ? (
                  <img src={item.image} alt="NFT" className="w-full h-full object-contain drop-shadow-md rounded-xl pointer-events-none" />
                ) : (
                  <>
                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`} className="w-16 h-16 object-contain pointer-events-none" />
                    <span className="font-bold text-center line-clamp-1 w-full text-sm mt-1 pointer-events-none">{item.name}</span>
                    <span className="absolute top-2 right-2 bg-white border border-border px-2 py-0.5 rounded-full text-xs font-bold shadow-sm pointer-events-none">
                      x{item.amount}
                    </span>
                  </>
                )}
              </motion.div>
            ))}
          </div>

          <div
            ref={dropZoneRef}
            className={`h-64 rounded-3xl border-2 flex flex-col items-center justify-center p-6 transition-all relative overflow-hidden shrink-0
              ${stagedItem ? 'border-foreground bg-secondary/30 border-solid' : 'border-border bg-secondary/10 hover:border-foreground/30 border-dashed'}`}
          >
            <AnimatePresence mode="wait">
              {!stagedItem ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-muted-foreground pointer-events-none">
                  <div className="w-12 h-12 mb-4 bg-white border border-border rounded-full flex items-center justify-center shadow-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 19 19 12"></polyline></svg>
                  </div>
                  <span className="text-xl font-bold uppercase tracking-widest mb-1 text-foreground/70">Send</span>
                  <span className="text-sm">Drag items or NFTs here</span>
                </motion.div>
              ) : (
                <motion.div key="staged" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-4 border-b border-border pb-4">
                    <div className="w-16 h-16 bg-white rounded-xl border border-border flex items-center justify-center p-2 shadow-sm shrink-0">
                      {stagedItem.type === 'nft' ? (
                        <img src={stagedItem.image} className="w-full h-full object-contain" />
                      ) : (
                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${stagedItem.name}`} className="w-full h-full object-contain" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold truncate">{stagedItem.type === 'nft' ? 'Selected NFT' : stagedItem.name}</h3>
                      <button onClick={() => setStagedItem(null)} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 mt-1 transition-colors">Cancel Selection</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Target Solana Wallet (or recipient)"
                      value={targetWallet}
                      onChange={e => setTargetWallet(e.target.value)}
                      className="w-full bg-white border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all"
                    />
                    <div className="flex gap-3">
                      {stagedItem.type === 'item' && (
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Amt:</span>
                          <input
                            type="number"
                            min="1"
                            max={stagedItem.amount}
                            value={sendAmount}
                            onChange={e => setSendAmount(Number(e.target.value))}
                            className="w-32 bg-white border border-border pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all"
                          />
                        </div>
                      )}
                      <button
                        onClick={handleSend}
                        disabled={!targetWallet || isSending}
                        className="flex-1 bg-foreground text-background font-bold py-3 rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
                      >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
                        <span>{isSending ? 'Sending...' : `Send ${stagedItem.type === 'item' ? 'Items' : 'NFT'}`}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-80 flex flex-col gap-4 py-4 shrink-0">
          <div className="mb-auto">
            <h2 className="text-4xl font-heading font-bold tracking-tight mb-2">Paused</h2>
            <p className="text-muted-foreground">Take a break.</p>
          </div>

          <button
            onClick={onResume}
            className="w-full py-5 px-6 bg-white border-2 border-foreground font-bold rounded-2xl hover:bg-foreground hover:text-background transition-all text-xl shadow-sm"
          >
            Continue
          </button>

          <button
            className="w-full py-4 px-6 bg-white border border-border font-bold rounded-2xl hover:bg-secondary transition-all"
          >
            Settings
          </button>

          <button
            onClick={onDisconnect}
            className="w-full py-4 px-6 mt-8 bg-white border border-border font-bold rounded-2xl hover:bg-secondary transition-all"
          >
            Quit Game
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function RuntimeScreen({ gameOptions, onGameStatus, zipLoaderPromise }: RuntimeScreenProps) {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const storageManager = useStorageManager();
  const prefetchData = usePrefetchData();
  const minetestConsole = useMinetestConsole();
  const [isLoading, setIsLoading] = useState(true);
  const [packManager] = useState(() => new PackManager(minetestConsole));
  const [isConnecting, setIsConnecting] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  const scriptLoadedRef = useRef(false);

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
        await storageManager.initialize({ policy: gameOptions.storagePolicy }, minetestConsole);
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
        const pct = deps > 0 ? (deps - left) / deps * 100 : 0;
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
  }, []);

  useEffect(() => {
    const h = (e: any) => setDisplayProgress(e.detail as number);
    window.addEventListener('minetest-progress', h);
    return () => window.removeEventListener('minetest-progress', h);
  }, []);

  useEffect(() => {
    if (storageManager) storageManager.setMinetestConsole(minetestConsole);
  }, [storageManager, minetestConsole]);

  useEffect(() => {
    const origExit = document.exitPointerLock.bind(document);
    document.exitPointerLock = function () {
      (window as any).__game_exited_pointer = true;
      origExit();
      setTimeout(() => { (window as any).__game_exited_pointer = false; }, 100);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && document.pointerLockElement === canvasRef.current) e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    const onLockChange = () => {
      if (document.pointerLockElement === canvasRef.current) {
        setIsConnecting(false);
        setIsPaused(false);
      } else {
        if (isConnecting) return;
        if ((window as any).__game_exited_pointer) {
          (window as any).__game_exited_pointer = false;
        } else {
          setIsPaused(true);
        }
      }
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      document.exitPointerLock = origExit;
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [isConnecting]);

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

  return (
    <>
      {isConnecting && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col items-center justify-center p-8">
          <h1 className="text-4xl font-heading font-bold mb-4">
            {isLoading ? 'Booting WebAssembly Engine...' : 'Connecting to Solcraft...'}
          </h1>
          <p className="text-muted-foreground mb-8">Securing connection and loading world data</p>
          {isLoading && (
            <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-75" style={{ width: `${displayProgress}%` }} />
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isPaused && !isConnecting && (
          <PauseMenu
            playerName={gameOptions.minetestArgs?.name || gameOptions.playerName || ''}
            onResume={handleResume}
            onDisconnect={() => window.location.reload()}
          />
        )}
      </AnimatePresence>

      <div ref={canvasContainerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <canvas ref={canvasRef} id="canvas" className="emscripten" onContextMenu={e => e.preventDefault()} tabIndex={-1} />
      </div>
    </>
  );
}