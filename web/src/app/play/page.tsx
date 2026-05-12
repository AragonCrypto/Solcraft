"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { CharacterSetupModal } from "@/components/game/CharacterSetupModal";
import { PlayerDashboardModal } from "@/components/game/PlayerDashboardModal";
import { RuntimeScreen } from "@/components/game/RuntimeScreen";
import GlobalProvider, { useExecutePrefetch, usePrefetchData } from "@/lib/minetest/GlobalContext";
import { GameOptionsLocal } from "@/components/game/RuntimeScreen";
import MinetestArgs from "@/lib/minetest/MinetestArgs";

const BACKEND_URL = "https://api.solcraft.me";

type PlayState = "connect" | "checking" | "setup" | "dashboard" | "playing";

function PlayPageContent() {
  const { connected, publicKey, signMessage } = useWallet();
  const { connection } = useConnection();
  const executePrefetch = useExecutePrefetch();
  const prefetchData = usePrefetchData();

  const [playState, setPlayState] = useState<PlayState>("connect");
  const [playerName, setPlayerName] = useState("");
  const [backendWallet, setBackendWallet] = useState("");
  const [gameOptions, setGameOptions] = useState<GameOptionsLocal | null>(null);
  const [mounted, setMounted] = useState(false);

  const [displayProgress, setDisplayProgress] = useState(0);
  const isReady = prefetchData.status.base === 'done' && prefetchData.status.voxelibre === 'done';

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (connected && publicKey) {
      executePrefetch('mineclone2');
      setPlayState("checking");

      fetch(`${BACKEND_URL}/api/auth/${publicKey.toBase58()}`)
        .then(res => {
          if (!res.ok) throw new Error("HTTP Status " + res.status);
          return res.json();
        })
        .then(data => {
          if (data.exists && data.player) {
            setPlayerName(data.player.player_name);
            setBackendWallet(data.player.backend_wallet_pubkey);
            setPlayState("dashboard");
          } else {
            setPlayState("setup");
          }
        })
        .catch(err => {
          console.error("Backend-Verbindungsfehler:", err);
          setPlayState("setup");
        });
    } else {
      setPlayState("connect");
    }
  }, [connected, publicKey, executePrefetch]);

  useEffect(() => {
    const baseStatus = prefetchData.status.base === 'done' ? 1 : (typeof prefetchData.status.base === 'number' ? prefetchData.status.base : 0);
    const voxelStatus = prefetchData.status.voxelibre === 'done' ? 1 : (typeof prefetchData.status.voxelibre === 'number' ? prefetchData.status.voxelibre : 0);
    const total = (baseStatus + voxelStatus) / 2 * 100;

    setDisplayProgress(prev => {
      const diff = total - prev;
      if (diff > 0) return prev + diff * 0.1;
      return prev;
    });
  }, [prefetchData]);

  const handleMint = async (name: string, mode: "Liquid" | "Manual") => {
    try {
      if (!publicKey) throw new Error("Wallet not connected");
      if (!signMessage) throw new Error("Dein Wallet unterstützt keine Signatur-Funktion.");

      console.log(`Fordere Signatur für die Registrierung an...`);
      const message = new TextEncoder().encode(
        `Willkommen bei Solcraft!\n\nBitte signiere diese Nachricht, um deinen Charakter "${name}" zu erstellen.\n\nEs fallen hierfür KEINE Gebühren an.`
      );

      const signatureBytes = await signMessage(message);
      const signature = Buffer.from(signatureBytes).toString("base64");

      const res = await fetch(`${BACKEND_URL}/api/player/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: name,
          phantom_wallet: publicKey.toBase58(),
          game_mode: mode.toUpperCase(),
          tx_signature: signature
        })
      });

      const data = await res.json();

      if (data.success) {
        setPlayerName(name);
        setBackendWallet(data.backend_wallet);
        setPlayState("dashboard");
      } else {
        alert("Server Fehler: " + data.error);
      }
    } catch (err: any) {
      console.error("Registrierung fehlgeschlagen:", err);
      if (err.message?.includes("User rejected")) {
        alert("Registrierung abgebrochen. Du musst die Nachricht signieren, um mitzuspielen.");
      } else {
        alert("Ein Fehler ist aufgetreten. Bitte versuche es nochmal.");
      }
    }
  };

  const handleJoin = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) { console.warn("Fullscreen request failed", e); }

    if (isReady && publicKey) {
      const options: GameOptionsLocal = {
        language: 'en',
        proxy: 'wss://eu1.dustlabs.io/mtproxy',
        storagePolicy: 'indexeddb',
        minetestArgs: new MinetestArgs(),
        mode: 'local',
        gameId: 'mineclone2',
        phantomWallet: publicKey.toBase58() // HIER WIRD ES REINGEGEBEN
      };

      options.minetestArgs.go = true;
      options.minetestArgs.gameid = 'mineclone2';
      options.minetestArgs.address = '116.203.126.146';
      options.minetestArgs.port = 30000;
      options.minetestArgs.name = playerName;
      options.minetestArgs.password = 'Solcraft123';

      setGameOptions(options);
      setPlayState("playing");
    }
  };

  if (playState === "playing" && gameOptions) {
    return (
      <RuntimeScreen
        gameOptions={gameOptions}
        onGameStatus={(status) => { if (status === 'failed') setPlayState("dashboard"); }}
        zipLoaderPromise={null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-bold">Back to Home</span>
      </Link>

      {playState === "connect" && (
        <div className="bg-white/80 backdrop-blur-xl border border-border p-12 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-md w-full">
          <Wallet className="w-16 h-16 text-foreground mb-6" />
          <h2 className="text-3xl font-heading font-bold mb-4">Connect Wallet</h2>
          <p className="text-muted-foreground mb-8">
            Connect your Phantom wallet to authenticate and enter Solcraft.
          </p>
          <div className="wallet-button-wrapper">
            {mounted && <WalletMultiButton />}
          </div>
        </div>
      )}

      {playState === "checking" && (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-bold">Synchronizing with Server...</p>
        </div>
      )}

      {playState === "setup" && (
        <CharacterSetupModal onMint={handleMint} />
      )}

      {playState === "dashboard" && publicKey && (
        <PlayerDashboardModal
          playerName={playerName}
          phantomWallet={publicKey.toBase58()}
          backendWallet={backendWallet}
          isReady={isReady}
          displayProgress={isReady ? 100 : displayProgress}
          onJoin={handleJoin}
        />
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <main>
      <GlobalProvider
        onExitDetected={() => window.location.reload()}
        onServerExitIntentDetected={() => { }}
      >
        <PlayPageContent />
      </GlobalProvider>
    </main>
  );
}