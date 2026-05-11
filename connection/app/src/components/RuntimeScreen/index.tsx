import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useMinetestConsole, usePrefetchData, useStorageManager } from '../../utils/GlobalContext';
import SnackBar from '../SnackBar';
import { type GameOptions } from '../../App';
import { fixGeometry as fixGeometryHelper, queryProxy } from './helpers';
import PackManager from './packManager';

interface RuntimeScreenProps {
  gameOptions: GameOptions;
  onGameStatus: (status: 'running' | 'failed') => void;
  zipLoaderPromise: Promise<Uint8Array> | null;
  serverExitTimestamp: Date | null;
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
    cwrap: (name: string, returnType: string | null, argTypes: string[]) => any;
    stringToNewUTF8: (text: string) => number;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    HEAPU8: Uint8Array;
    HEAPU32: Uint32Array;
  }
}

const RuntimeScreen: React.FC<RuntimeScreenProps> = ({ gameOptions, onGameStatus, zipLoaderPromise, serverExitTimestamp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [resolution, setResolution] = useState('high');
  const [aspectRatio, setAspectRatio] = useState('any');
  const storageManager = useStorageManager();
  const prefetchData = usePrefetchData();
  const minetestConsole = useMinetestConsole();
  const [isLoading, setIsLoading] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const settingsTimeoutRef = useRef<number | null>(null);
  const [packManager] = useState(() => new PackManager(minetestConsole));
  const [vpnServerCode, setVpnServerCode] = useState<string | null>(null);
  const [vpnClientCode, setVpnClientCode] = useState<string | null>(null);
  
  // Custom states for Solcraft
  const [isConnecting, setIsConnecting] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Function to fix canvas geometry based on selected options
  const resolutionRef = useRef(resolution);
  const aspectRatioRef = useRef(aspectRatio);
  resolutionRef.current = resolution;
  aspectRatioRef.current = aspectRatio;
  const fixGeometry = useCallback(() => {
    if (!canvasRef.current || !canvasContainerRef.current) return;
    fixGeometryHelper(canvasRef.current, canvasContainerRef.current, resolution, aspectRatio);
  }, []);

  // Handle aspect ratio change
  const handleAspectRatioChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setAspectRatio(e.target.value);
  }, []);

  // Handle resolution change
  const handleResolutionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setResolution(e.target.value);
  }, []);

  // Apply proxy setting
  const setProxy = useCallback((proxyUrl: string) => {
    if (window.emsocket_set_proxy && window.stringToNewUTF8) {
      const proxyBuf = window.stringToNewUTF8(proxyUrl);
      window.emsocket_set_proxy(proxyBuf);
      window._free(proxyBuf);
      minetestConsole.print(`RuntimeScreen: setProxy ${proxyUrl}`);
    }
    else {
      minetestConsole.printErr("RuntimeScreen: setProxy failed");
    }
  }, []);

  // Apply VPN settings
  const setVpn = useCallback((serverCode: string | null, clientCode: string | null) => {
    console.log('setVpn', serverCode, clientCode);
    setVpnServerCode(serverCode);
    setVpnClientCode(clientCode);
    // Use serverCode when available, otherwise use clientCode
    const code = serverCode || clientCode;
    if (code !== null) {
      const vpnBuf = window.stringToNewUTF8(code);
      window.emsocket_set_vpn(vpnBuf);
      window._free(vpnBuf);
    }
  }, []);

  // Function to create argv for main
  const makeArgv = useCallback((args: string[]) => {
    if (!window._malloc || !window.HEAPU8 || !window.stringToNewUTF8) {
      minetestConsole.printErr("Error: Required Emscripten functions not available");
      return [0, 0];
    }

    // Allocate memory for pointers (4 bytes per pointer)
    const argv = window._malloc((args.length + 1) * 4);
    let i;
    for (i = 0; i < args.length; i++) {
      window.HEAPU32[(argv >>> 2) + i] = window.stringToNewUTF8(args[i]);
    }
    window.HEAPU32[(argv >>> 2) + i] = 0; // argv[argc] == NULL
    return [i, argv];
  }, []);

  // Launch the game with the current settings
  const launchGameRef = useRef<(() => Promise<void>) | null>(null);
  launchGameRef.current = (async () => {
    try {
      if (!storageManager) {
        throw new Error('StorageManager does not exist');
      }
      if (!(await storageManager.isInitialized)) {
        // Initialize the storage manager with the selected storage policy
        await storageManager.initialize(
          { policy: gameOptions.storagePolicy },
          minetestConsole,
        );
      }
      if (zipLoaderPromise) {
        const zipFile = await zipLoaderPromise;
        await storageManager.restoreFromZip(zipFile);
      }
      if (!storageManager.hasCopiedToModuleFS) {
        await storageManager.copyToModuleFS();
      }
      minetestConsole.print(`Storage initialized with policy: ${gameOptions.storagePolicy}`);

      // Always install the base and voxelibre packs
      minetestConsole.print("Installing required game packs...");
      await packManager.addPack('base', prefetchData.result.base!);
      if (gameOptions.gameId === 'mineclone2') {
        await packManager.addPack('voxelibre', prefetchData.result.voxelibre!);
      }
      else if (gameOptions.gameId === 'mineclonia') {
        await packManager.addPack('mineclonia', prefetchData.result.mineclonia!);
      }
      else if (gameOptions.gameId === 'minetest_game') {
        await packManager.addPack('minetest_game', prefetchData.result.minetest_game!);
      }
      else if (gameOptions.gameId === 'glitch') {
        await packManager.addPack('glitch', prefetchData.result.glitch!);
      }
      else if (gameOptions.gameId === 'blockbomber') {
        await packManager.addPack('blockbomber', prefetchData.result.blockbomber!);
      }

      // Set canvas size
      if (canvasRef.current) fixGeometry();

      // Create config
      const conf = {
        'viewing_range': '140',
        'max_block_send_distance': '10',
        'max_block_generate_distance': '10',
        'block_send_optimize_distance': '10',
        'client_mapblock_limit': '8000',
        'no_mtg_notification': 'true',
        'language': gameOptions.language,
        'mcl_playersSleepingPercentage': '1',
        'keymap_inventory': 'KEY_KEY_E', // Change inventory to 'E'
        'keymap_noclip': '', // Disable H
        'keymap_fastmove': '', // Disable J
        'keymap_freemove': '', // Disable K
        'keymap_mute': '', // Disable M
        'keymap_minimap': '', // Disable V
        'keymap_console': '', // Disable F10
        'keymap_chat': '', // Disable T
        'keymap_cmd_local': '', // Disable /
        'keymap_toggle_debug': '', // Disable F5
        'keymap_toggle_chat': '', // Disable F2
        'keymap_toggle_profiler': '', // Disable F6
        'keymap_zoom': '', // Disable Z (Zoom)
        'show_nametag_backgrounds': 'false', // Hide nametags where possible
        'show_entity_selectionbox': 'false',
      };
      
      if (window.emloop_set_minetest_conf && window.stringToNewUTF8) {
        const confLines = [];
        for (const [key, value] of Object.entries(conf)) {
          confLines.push(`${key} = ${value}`);
        }
        const confTxt = confLines.join('\n') + '\n';
        const confBuf = window.stringToNewUTF8(confTxt);
        window.emloop_set_minetest_conf(confBuf);
        window._free(confBuf);
      }

      // Initialize sound
      if (window.emloop_init_sound) window.emloop_init_sound();

      // Initialize emsocket after setting proxy and VPN
      if (window.emsocket_init) {
        window.emsocket_init();
        minetestConsole.print("emsocket initialized");
      }

      // Set up network - do this before initializing emsocket
      setProxy(gameOptions.proxy);
      
      // Handle game mode specific settings and VPN setup
      // Do this before emsocket_init
      if (gameOptions.mode === 'join') {
        if (!gameOptions.joinCode) {
          throw new Error('RuntimeScreen: Join code is required');
        }
        setVpn(null, gameOptions.joinCode);
      }
      else if (gameOptions.mode === 'host') {
        const [cmd, serverCode, clientCode] = await queryProxy(`MAKEVPN ${gameOptions.gameId}`, gameOptions.proxy);
        if (cmd != 'NEWVPN') {
          throw new Error('Invalid response from proxy');
        }
        console.log('serverCode', serverCode);
        console.log('clientCode', clientCode);
        setVpn(serverCode, clientCode);
      }

      // Set up minetest args
      const { minetestArgs } = gameOptions;
      // minetestArgs.clear();

      // NOTE: With --go the server seems to load too slowly for the client to connect,
      // at least for big games like voxelibre

      // Note: Share an object like {"gameId": "minetest_game", "clientCode": "..."} to the clients

      if (gameOptions.mode === 'join') {
        minetestArgs.go = true;
        minetestArgs.gameid = gameOptions.gameId;
        minetestArgs.address = '172.16.0.1';
        minetestArgs.port = 30000;
        minetestArgs.name = gameOptions.playerName || 'Player' + Math.random().toString(36).substring(2, 7);
        minetestArgs.password = gameOptions.password || Math.random().toString(36).substring(2, 12);
      }
      // else if (gameOptions.mode === 'host') {
      //   minetestArgs.go = true;
      //   minetestArgs.gameid = gameOptions.gameId;
      //   minetestArgs.address = '127.0.0.1';
      //   minetestArgs.port = 30000;
      //   minetestArgs.name = gameOptions.playerName!;
      //   minetestArgs.worldname = gameOptions.worldName!;
      //   minetestArgs.extra.push('--withserver');
      // }

      if (minetestArgs.go && window.irrlicht_force_pointerlock) {
        window.irrlicht_force_pointerlock();
      }

      console.log("GAME OPTIONS", gameOptions);

      // Launch the game
      if (window.emloop_invoke_main) {
        const fullArgs = ['./minetest', ...minetestArgs.toArray()];

        minetestConsole.print("Starting: " + fullArgs.join(' '));
        const [argc, argv] = makeArgv(fullArgs);
        window.emloop_invoke_main(argc, argv);
        window.emloop_request_animation_frame?.();

        onGameStatus('running');
      }
    } catch (error) {
      minetestConsole.printErr(`Error launching game: ${error}`);
      setIsLoading(false);
      onGameStatus('failed');
    } finally {
      setIsLoading(false);
    }
  });

  // Setup the global functions needed by the WASM module
  useLayoutEffect(() => {
    // Define the emloop_ready function that will be called by the WASM module
    window.emloop_ready = () => {
      minetestConsole.print("emloop_ready called. Setting up functions...");

      try {
        // Setup cwrapped functions - copied from original launcher.js
        window.emloop_pause = window.cwrap("emloop_pause", null, []);
        window.emloop_unpause = window.cwrap("emloop_unpause", null, []);
        window.emloop_init_sound = window.cwrap("emloop_init_sound", null, []);
        window.emloop_invoke_main = window.cwrap("emloop_invoke_main", null, ["number", "number"]);
        window.emloop_install_pack = window.cwrap("emloop_install_pack", null, ["number", "number", "number"]);
        window.emloop_set_minetest_conf = window.cwrap("emloop_set_minetest_conf", null, ["number"]);
        window.irrlicht_want_pointerlock = window.cwrap("irrlicht_want_pointerlock", "number", []);
        window.irrlicht_force_pointerlock = window.cwrap("irrlicht_force_pointerlock", null, []);
        window.irrlicht_resize = window.cwrap("irrlicht_resize", null, ["number", "number"]);
        window.emsocket_init = window.cwrap("emsocket_init", null, []);
        window.emsocket_set_proxy = window.cwrap("emsocket_set_proxy", null, ["number"]);
        window.emsocket_set_vpn = window.cwrap("emsocket_set_vpn", null, ["number"]);

        minetestConsole.print("Successfully wrapped Emscripten functions");

        launchGameRef.current?.();
      } catch (err) {
        minetestConsole.printErr(`Error setting up game: ${err}`);
        setIsLoading(false);
      }
    };

    // Define emloop_request_animation_frame function
    window.emloop_request_animation_frame = () => {
      if (window.emloop_pause) window.emloop_pause();
      window.requestAnimationFrame(() => {
        if (window.emloop_unpause) window.emloop_unpause();
      });
    };

    return () => {
      // Cleanup global functions
      delete window.emloop_ready;
      delete window.emloop_request_animation_frame;
    };
  }, []);

  // Initialize the WASM module
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const modulePath = `minetest/minetest.js`;

    // Set up Module configuration for Emscripten
    window.Module = {
      preRun: [],
      postRun: [],
      print: minetestConsole.print,
      printErr: minetestConsole.printErr,
      canvas: canvas,
      onAbort: () => {
        minetestConsole.printErr('Fatal error: Emscripten module aborted');
        onGameStatus('failed');
      },
      totalDependencies: 0,
      monitorRunDependencies: (left: number) => {
        const deps = Math.max(window.Module.totalDependencies, left);
        window.Module.totalDependencies = deps;
        const progress = (deps - left) / deps;
        window.dispatchEvent(new CustomEvent('minetest-progress', { detail: progress * 100 }));
        minetestConsole.print(`Loading progress: ${Math.round(progress * 100)}%`);
      },
      setStatus: (text: string) => {
        if (text) minetestConsole.print('[wasm module status] ' + text);
      },
      onRuntimeInitialized: () => {
        minetestConsole.print('Runtime initialized, waiting for emloop_ready...');
      },
      // Add handlers for file operations to sync with IndexedDB
      onFileChange: (path: string) => {
        // Normalize the path
        if (storageManager) {
          storageManager.fileChanged(path);
        }
      },
      onFileDelete: (path: string) => {
        if (storageManager) {
          storageManager.fileDeleted(path);
        }
      }
    };

    // Add worker injection script for proper thread communication
    const workerInject = `
      Module['print'] = (text) => {
        postMessage({cmd: 'callHandler', handler: 'print', args: [text], threadId: Module['_pthread_self']()});
      };
      Module['printErr'] = (text) => {
        postMessage({cmd: 'callHandler', handler: 'printErr', args: [text], threadId: Module['_pthread_self']()});
      };
      importScripts('minetest.js');
    `;
    window.Module['mainScriptUrlOrBlob'] = new Blob([workerInject], { type: "text/javascript" });
    window.Module['onFullScreen'] = () => { fixGeometry(); };

    // Function to load the script
    const loadScript = () => {
      minetestConsole.print(`Loading WebAssembly module from ${modulePath}...`);
      const script = document.createElement('script');
      script.src = modulePath;
      script.async = true;
      script.onerror = () => {
        minetestConsole.printErr(`Error loading WebAssembly module from ${modulePath}`);
        onGameStatus('failed');
      };
      script.onload = () => {
        minetestConsole.print('WebAssembly module loaded successfully');
      };
      document.body.appendChild(script);
    };

    // Load the module
    loadScript();

    // Set up resize handling
    const handleResize = () => fixGeometry();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [onGameStatus]);

  // Update geometry when resolution or aspect ratio changes
  useEffect(() => {
    fixGeometry();
  }, [resolution, aspectRatio]);

  useEffect(() => {
    if (storageManager) {
      storageManager.setMinetestConsole(minetestConsole);
    }
  }, [storageManager, minetestConsole]);

  const [loadProgress, setLoadProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const handleProgress = (e: any) => {
      setLoadProgress(e.detail);
    };
    window.addEventListener('minetest-progress', handleProgress);
    return () => window.removeEventListener('minetest-progress', handleProgress);
  }, []);

  // Smooth fake progress bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setDisplayProgress(prev => {
          // If real load progress is exactly 100, jump to 100
          if (loadProgress >= 100) return 100;
          // Otherwise, slowly approach 90% or the real progress if it's higher
          const target = Math.max(loadProgress, 90);
          const diff = target - prev;
          if (diff > 0) {
            return prev + (diff * 0.02); // very slow creeping
          }
          return prev;
        });
      }, 50);
    } else {
      setDisplayProgress(100);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [isLoading, loadProgress]);

  // Intercept ESC and handle pointer lock state
  useEffect(() => {
    // Hijack browser's exitPointerLock to know when the game calls it vs when the user forces it
    const origExitPointerLock = document.exitPointerLock;
    document.exitPointerLock = function() {
      (window as any).__game_exited_pointer = true;
      if (origExitPointerLock) {
        origExitPointerLock.call(document);
      }
      setTimeout(() => {
        (window as any).__game_exited_pointer = false;
      }, 100);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (document.pointerLockElement === canvasRef.current) {
          // Game is actively capturing pointer. User wants to pause.
          e.stopPropagation(); // Prevent Minetest from receiving ESC so it doesn't open its menu
          // Browser will naturally drop pointer lock, triggering pointerlockchange
        } else {
          // Pointer lock is already lost (e.g. inventory open). Let Minetest receive ESC to close it!
        }
      }
    };
    
    // Capture phase so we get it before Emscripten
    window.addEventListener('keydown', handleKeyDown, true);

    const handlePointerLockChange = () => {
      if (document.pointerLockElement === canvasRef.current) {
        setIsConnecting(false);
        setIsPaused(false);
        // Successfully connected, no longer connecting
      } else {
        // Pointer lock lost.
        if (isConnecting) return; // If we haven't connected yet, don't show pause menu
        
        // Did the game drop it intentionally?
        if ((window as any).__game_exited_pointer) {
           // Inventory or formspec opened. Do nothing, let user interact.
           (window as any).__game_exited_pointer = false;
        } else {
           // User forced pointer lock drop (ESC, Alt-Tab, click outside, etc)
           setIsPaused(true);
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.exitPointerLock = origExitPointerLock;
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isConnecting]);

  // Loading timeout (60 seconds)
  useEffect(() => {
    if (isConnecting) {
      const timer = setTimeout(() => {
        console.error("Game connection timed out after 60 seconds.");
        window.location.reload();
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [isConnecting]);

  const handleResume = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      console.warn('Fullscreen request failed', e);
    }
    canvasRef.current?.requestPointerLock();
  };

  return (
    <div className="h-[100vh] w-[100vw] flex flex-col bg-black relative overflow-hidden">
      
      {/* Solcraft Custom Loading / Connecting Overlay */}
      {isConnecting && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          <h1 className="text-6xl font-bold mb-8 text-purple-500 tracking-wider">SOLCRAFT</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-xl text-gray-400 mb-4">
            {isLoading ? 'Booting WebAssembly Engine...' : 'Connecting to Server...'}
          </p>
          {isLoading && (
            <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-75 ease-linear" 
                style={{ width: `${displayProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Solcraft Pause Menu */}
      {isPaused && !isConnecting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-40">
          <h2 className="text-5xl font-bold text-white mb-8">GAME PAUSED</h2>
          
          <div className="flex flex-col space-y-4">
            <button 
              onClick={handleResume}
              className="px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white text-xl font-bold rounded shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all"
            >
              RESUME GAME
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white text-xl font-bold rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all"
            >
              DISCONNECT
            </button>
          </div>
          
          <div className="absolute bottom-8 text-gray-400 text-center">
            <p>Inventory: Press <strong>E</strong></p>
            <p>Pause: Press <strong>ESC</strong></p>
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={canvasContainerRef}
        className="m-0 p-0"
        style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      >
        <canvas
          ref={canvasRef}
          id="canvas"
          className="emscripten"
          onContextMenu={(e) => e.preventDefault()}
          tabIndex={-1}
        ></canvas>
      </div>



      <SnackBar />
    </div>
  );
};

export default RuntimeScreen; 