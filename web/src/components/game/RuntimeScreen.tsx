"use client";

import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useMinetestConsole, usePrefetchData, useStorageManager } from '@/lib/minetest/GlobalContext';
import { fixGeometry as fixGeometryHelper } from '@/lib/minetest/helpers';
import PackManager from '@/lib/minetest/packManager';
import { Loader2 } from 'lucide-react';

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
  zipLoaderPromise: Promise<Uint8Array> | null;
}

declare global {
  interface Window {
    emloop_ready?: () => void;
    emloop_request_animation_frame?: () => void;
    Module: any;
    emloop_pause: any; emloop_unpause: any; emloop_init_sound: any;
    emloop_invoke_main: any; emloop_install_pack: any; emloop_set_minetest_conf: any;
    irrlicht_want_pointerlock: any; irrlicht_force_pointerlock: any; irrlicht_resize: any;
    emsocket_init: any; emsocket_set_proxy: any; emsocket_set_vpn: any;
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

  // Always up-to-date launch function, called from emloop_ready
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

      // Set proxy
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

  // Register emloop_ready (the WASM calls this when it's ready for us)
  useLayoutEffect(() => {
    window.emloop_ready = () => {
      minetestConsole.print('emloop_ready called — wrapping C functions...');
      try {
        window.emloop_pause          = window.cwrap('emloop_pause', null, []);
        window.emloop_unpause        = window.cwrap('emloop_unpause', null, []);
        window.emloop_init_sound     = window.cwrap('emloop_init_sound', null, []);
        window.emloop_invoke_main    = window.cwrap('emloop_invoke_main', null, ['number', 'number']);
        window.emloop_install_pack   = window.cwrap('emloop_install_pack', null, ['number', 'number', 'number']);
        window.emloop_set_minetest_conf = window.cwrap('emloop_set_minetest_conf', null, ['number']);
        window.irrlicht_want_pointerlock = window.cwrap('irrlicht_want_pointerlock', 'number', []);
        window.irrlicht_force_pointerlock = window.cwrap('irrlicht_force_pointerlock', null, []);
        window.irrlicht_resize       = window.cwrap('irrlicht_resize', null, ['number', 'number']);
        window.emsocket_init         = window.cwrap('emsocket_init', null, []);
        window.emsocket_set_proxy    = window.cwrap('emsocket_set_proxy', null, ['number']);
        window.emsocket_set_vpn      = window.cwrap('emsocket_set_vpn', null, ['number']);
        minetestConsole.print('C functions wrapped. Launching game...');
        launchGameRef.current?.();
      } catch (e) {
        minetestConsole.printErr(`emloop_ready error: ${e}`);
        setIsLoading(false);
      }
    };
    window.emloop_request_animation_frame = () => {
      if (window.emloop_pause) window.emloop_pause();
      window.requestAnimationFrame(() => { if (window.emloop_unpause) window.emloop_unpause(); });
    };
    return () => { delete window.emloop_ready; delete window.emloop_request_animation_frame; };
  }, []);

  // Load the WASM module — exactly once, even in React 18 Strict Mode
  useEffect(() => {
    if (!canvasRef.current || scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const canvas = canvasRef.current;

    // ── THE FIX: Blob-based mainScriptUrlOrBlob exactly as in working `connection` project.
    // Workers are spawned from locateFile('minetest.worker.js') = /minetest/minetest.worker.js.
    // That worker receives urlOrBlob in its 'load' message and calls importScripts(urlOrBlob).
    // A Blob URL resolves relative imports against the worker's own URL (/minetest/),
    // so importScripts('minetest.js') → /minetest/minetest.js ✓
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
      // locateFile: routes .wasm and .worker.js to /minetest/
      locateFile: (path: string) => `/minetest/${path}`,
      mainScriptUrlOrBlob: new Blob([workerInject], { type: 'text/javascript' }),
      preRun: [],
      postRun: [],
      print:    (t: string) => minetestConsole.print(t),
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
      setStatus: (_: string) => {},
      onRuntimeInitialized: () => { minetestConsole.print('Runtime initialized.'); },
      onFileChange: (p: string) => storageManager?.fileChanged(p),
      onFileDelete: (p: string) => storageManager?.fileDeleted(p),
      onFullScreen: () => fixGeometry(),
    };

    const script = document.createElement('script');
    script.src = '/minetest/minetest.js';
    script.async = true;
    script.onerror = () => { minetestConsole.printErr('Failed to load minetest.js'); onGameStatus('failed'); };
    script.onload  = () => { minetestConsole.print('minetest.js loaded.'); };
    document.body.appendChild(script);

    const onResize = () => fixGeometry();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress bar
  useEffect(() => {
    const h = (e: any) => setDisplayProgress(e.detail as number);
    window.addEventListener('minetest-progress', h);
    return () => window.removeEventListener('minetest-progress', h);
  }, []);

  // Storage console sync
  useEffect(() => {
    if (storageManager) storageManager.setMinetestConsole(minetestConsole);
  }, [storageManager, minetestConsole]);

  // Pointer-lock / pause management (copied verbatim from connection)
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
        setIsConnecting(false); setIsPaused(false);
      } else {
        if (isConnecting) return;
        if ((window as any).__game_exited_pointer) { (window as any).__game_exited_pointer = false; }
        else setIsPaused(true);
      }
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      document.exitPointerLock = origExit;
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [isConnecting]);

  // 60-second watchdog
  useEffect(() => {
    if (!isConnecting) return;
    const t = setTimeout(() => { minetestConsole.printErr('Connection timeout — reloading.'); window.location.reload(); }, 60_000);
    return () => clearTimeout(t);
  }, [isConnecting]);

  const handleResume = async () => {
    try { await document.documentElement.requestFullscreen(); } catch (_) {}
    canvasRef.current?.requestPointerLock();
  };

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden">
      {isConnecting && (
        <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col items-center justify-center z-50">
          <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center border border-border">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
            <h2 className="text-2xl font-heading font-bold mb-2">
              {isLoading ? 'Booting WebAssembly Engine...' : 'Connecting to Solcraft...'}
            </h2>
            <p className="text-muted-foreground mb-6">Securing connection and loading world data</p>
            {isLoading && (
              <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-75" style={{ width: `${displayProgress}%` }} />
              </div>
            )}
          </div>
        </div>
      )}
      {isPaused && !isConnecting && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-40">
          <h2 className="text-5xl font-heading font-black mb-8 tracking-tight">Game Paused</h2>
          <div className="flex flex-col gap-4">
            <button onClick={handleResume} className="px-10 py-4 bg-primary text-white text-xl font-bold rounded-xl hover:opacity-90 transition-all">Resume</button>
            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-red-500 text-white text-xl font-bold rounded-xl hover:bg-red-600 transition-all">Disconnect</button>
          </div>
        </div>
      )}
      <div ref={canvasContainerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <canvas ref={canvasRef} id="canvas" className="emscripten" onContextMenu={e => e.preventDefault()} tabIndex={-1} />
      </div>
    </div>
  );
}
