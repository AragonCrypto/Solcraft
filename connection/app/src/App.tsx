import React, { useState, useCallback } from 'react';
import RuntimeScreen from './components/RuntimeScreen';
import GlobalProvider, { usePrefetchData, useExecutePrefetch } from './utils/GlobalContext';
import './App.css';
import MinetestArgs from './utils/MinetestArgs';
import { PROXIES } from './utils/common';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import '@solana/wallet-adapter-react-ui/styles.css';

export type GameId = 'minetest_game' | 'mineclonia' | 'mineclone2' | 'glitch' | 'blockbomber';

// Define the game options interface
export interface GameOptions {
  language: string;
  proxy: string;
  storagePolicy: string;
  minetestArgs: MinetestArgs;
  mode: 'local' | 'host' | 'join';
  gameId: GameId;
  playerName?: string;
  password?: string;
  joinCode?: string;
  worldName?: string;
}

const initial_proxy = PROXIES[parseInt(localStorage.getItem('luanti_wasm_selected_proxy') || '0')];

// --- NEUER START-BUTTON FÜR SOLANA HACKATHON ---
const AutoLoader: React.FC<{ onStartGame: (options: GameOptions) => void }> = ({ onStartGame }) => {
  const prefetchData = usePrefetchData();
  const executePrefetch = useExecutePrefetch();
  const { connected, publicKey } = useWallet();
  const [customName, setCustomName] = useState('');
  const [nameError, setNameError] = useState('');

  React.useEffect(() => {
    // Triggert den Download von base.pack und voxelibre.pack
    executePrefetch('mineclone2');
  }, [executePrefetch]);

  const handleStart = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }
    
    if (prefetchData.status.base === 'done' && prefetchData.status.voxelibre === 'done') {
      const options: GameOptions = {
        language: 'en',
        proxy: 'wss://eu1.dustlabs.io/mtproxy', // WSS -> UDP Proxy
        storagePolicy: 'indexeddb',
        minetestArgs: new MinetestArgs(),
        mode: 'local', // WICHTIG: 'local' verhindert, dass das Spiel VPN-Modi erzwingt
        gameId: 'mineclone2'
      };
      
      // HIER INJIZIEREN WIR DEINE HARDCODED WERTE
      options.minetestArgs.go = true;
      options.minetestArgs.gameid = 'mineclone2';
      options.minetestArgs.address = 'mexico-damages.gl.at.ply.gg';
      options.minetestArgs.port = 64832;
      
      // Nutze Custom Name, falls vorhanden, sonst Fallback
      let playerName = customName.trim();
      if (!playerName) {
        if (publicKey) {
           playerName = 'Sol_' + publicKey.toString().substring(0, 10);
        } else {
           playerName = 'Player' + Math.floor(Math.random() * 1000);
        }
      }
      
      // Ensure it is valid for minetest (alphanumeric, max 20)
      playerName = playerName.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 20);
      
      options.minetestArgs.name = playerName;
      // WICHTIG: Ein leeres oder fehlendes Passwort öffnet das In-Game Menü! Daher ein Dummy-Passwort (oder das echte).
      options.minetestArgs.password = 'Solcraft123'; 
      
      onStartGame(options);
    }
  };

  const isReady = prefetchData.status.base === 'done' && prefetchData.status.voxelibre === 'done';

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-black text-white z-50">
      <h1 className="text-6xl font-bold mb-8 text-purple-500 tracking-wider">SOLCRAFT</h1>
      
      {!isReady ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-xl text-gray-400">Loading Metaverse Engine...</p>
        </div>
      ) : !connected ? (
        <div className="flex flex-col items-center space-y-6">
          <p className="text-xl text-gray-400">Please connect your Phantom wallet to continue</p>
          <WalletMultiButton style={{ backgroundColor: '#9333ea' }} />
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          <p className="text-green-400 text-lg">Wallet Connected: {publicKey?.toString().substring(0,8)}...</p>
          
          <div className="flex flex-col items-start w-full max-w-xs">
            <label className="text-sm text-gray-400 mb-2">Choose Player Name:</label>
            <input 
              type="text" 
              value={customName}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                setCustomName(val);
                if (val.length > 0 && val.length < 3) {
                  setNameError("Name too short (min 3 chars)");
                } else {
                  setNameError("");
                }
              }}
              placeholder="e.g. SolanaKing"
              maxLength={20}
              className={`w-full bg-gray-800 border ${nameError ? 'border-red-500' : 'border-gray-700'} text-white rounded px-4 py-2 focus:outline-none focus:border-purple-500 transition-colors`}
            />
            {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
          </div>

          <button 
            onClick={() => {
               if (customName.toLowerCase() === 'admin' || customName.toLowerCase() === 'server') {
                  setNameError("This name is already taken!");
                  return;
               }
               handleStart();
            }}
            disabled={!customName.trim() || !!nameError}
            className={`px-12 py-6 text-white text-2xl font-bold rounded-lg transition-all transform ${customName.trim() && !nameError ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:shadow-[0_0_30px_rgba(168,85,247,0.8)] hover:scale-105' : 'bg-gray-600 cursor-not-allowed opacity-50'}`}
          >
            MINT PLAYER & ENTER
          </button>
        </div>
      )}
    </div>
  );
};


function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [zipLoaderPromise, setZipLoaderPromise] = useState<Promise<Uint8Array> | null>(null);
  const [serverExitTimestamp, setServerExitTimestamp] = useState<Date | null>(null);
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    language: 'en',
    proxy: initial_proxy[0],
    storagePolicy: 'indexeddb',
    minetestArgs: new MinetestArgs(),
    mode: 'local',
    gameId: 'minetest_game'
  });

  const handleStartGame = useCallback((options: GameOptions) => {
    setGameOptions(options);
    setIsGameStarted(true);
  }, []);
  
  const updateGameOptions = useCallback((options: Partial<GameOptions>) => {
    setGameOptions(prevOptions => ({
      ...prevOptions,
      ...options
    }));
  }, []);

  const handleExitDetected = useCallback((exitCode: number) => {
    console.log('Game exited with code:', exitCode);
    window.location.reload();
  }, []);

  const handleServerExitIntentDetected = useCallback(() => {
    console.log('Server exit intent detected');
    setServerExitTimestamp(new Date());
  }, []);
  
  const handleGameStatus = useCallback((status: 'running' | 'failed') => {
    console.log('handleGameStatus called with status:', status);
    if (status === 'failed') {
      // If game fails to start, go back to start screen
      setIsGameStarted(false);
    }
  }, []);

  const endpoint = 'https://api.devnet.solana.com';
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen w-full bg-gray-900 text-white">
            <GlobalProvider
              onExitDetected={handleExitDetected}
              onServerExitIntentDetected={handleServerExitIntentDetected}
            >
              {!isGameStarted ? (
                // HIER HABEN WIR DEN STARTSCREEN ERSETZT:
                <AutoLoader onStartGame={handleStartGame} />
              ) : (
                <RuntimeScreen
                  gameOptions={gameOptions}
                  onGameStatus={handleGameStatus}
                  zipLoaderPromise={zipLoaderPromise}
                  serverExitTimestamp={serverExitTimestamp}
                />
              )}
            </GlobalProvider>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App; 