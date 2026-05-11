"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Transaction, TransactionInstruction, PublicKey } from "@solana/web3.js";

import { CharacterSetupModal } from "@/components/game/CharacterSetupModal";
import { PlayerDashboardModal } from "@/components/game/PlayerDashboardModal";
import { RuntimeScreen } from "@/components/game/RuntimeScreen";
import GlobalProvider, { useExecutePrefetch, usePrefetchData } from "@/lib/minetest/GlobalContext";
import { GameOptionsLocal } from "@/components/game/RuntimeScreen";
import MinetestArgs from "@/lib/minetest/MinetestArgs";

// HIER IST DEINE SERVER-IP HINTERLEGT!
const BACKEND_URL = "http://116.203.126.146:4000";

type PlayState = "connect" | "checking" | "setup" | "dashboard" | "playing";

function PlayPageContent() {
  const { connected, publicKey, sendTransaction } = useWallet();
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. EXISTIERENDEN SPIELER CHECKEN
  useEffect(() => {
    if (connected && publicKey) {
      // Prefetch starten
      executePrefetch('mineclone2');
      setPlayState("checking");

      // Backend anfragen: Kennt die Datenbank diese Phantom Wallet schon?
      fetch(`${BACKEND_URL}/api/auth/${publicKey.toBase58()}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists && data.player) {
            // Spieler gefunden! Springe direkt zum Dashboard
            setPlayerName(data.player.player_name);
            setBackendWallet(data.player.backend_wallet_pubkey);
            setPlayState("dashboard");
          } else {
            // Neuer Spieler -> Muss sich einen Namen aussuchen
            setPlayState("setup");
          }
        })
        .catch(err => {
          console.error("Datenbank-Verbindungsfehler:", err);
          // Fallback, falls Server down ist
          setPlayState("setup");
        });
    } else {
      setPlayState("connect");
    }
  }, [connected, publicKey, executePrefetch]);

  // Download-Fortschrittsbalken
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

  // 2. NEUEN SPIELER MINTEN (SICHERER SOLANA TRANSACTION FLOW)
  const handleMint = async (name: string, mode: "Liquid" | "Manual") => {
    try {
      let signature = "manual_registration_no_tx";

      if (mode === "Liquid") {
        if (!publicKey) throw new Error("Wallet not connected");

        // DIE SICHERE METHODE: Ein Memo auf die Blockchain schreiben (Kosten: Fast 0 SOL)
        // Das verhindert Phantom "Simulation Failed" oder "Malicious" Warnungen!
        const tx = new Transaction().add(
          new TransactionInstruction({
            keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
            data: Buffer.from(`Solcraft Player Registration: ${name}`, "utf-8"),
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), // Offizielles Solana Memo Program
          })
        );

        // EXTREM WICHTIG FÜR PHANTOM: Wir müssen einen frischen Blockhash holen!
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        // signAndSendTransaction wird hier von der Wallet-Adapter Library intern absolut fehlerfrei aufgerufen
        signature = await sendTransaction(tx, connection);

        // Warten, bis das Netzwerk die Transaktion bestätigt hat
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
      }

      // 3. WENN TX ERFOLGREICH -> BACKEND INFORMIEREN UND CUSTODIAL WALLET GENERIEREN LASSEN
      const res = await fetch(`${BACKEND_URL}/api/player/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: name,
          phantom_wallet: publicKey!.toBase58(),
          game_mode: mode.toUpperCase(),
          tx_signature: signature
        })
      });

      const data = await res.json();

      if (data.success) {
        setPlayerName(name);
        setBackendWallet(data.backend_wallet); // Die Custodial Wallet für den QR Code!
        setPlayState("dashboard");
      } else {
        alert("Server Fehler: " + data.error);
      }
    } catch (err: any) {
      console.error("Minting fehlgeschlagen:", err);
      // Wenn der User in Phantom auf "Abbrechen" klickt, fangen wir das hier ab
      if (err.message?.includes("User rejected")) {
        alert("Transaktion abgebrochen. Du musst signieren, um Liquid Player zu werden.");
      } else {
        alert("Transaktion fehlgeschlagen. Prüfe deine SOL-Balance (Devnet).");
      }
    }
  };

  const handleJoin = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }

    if (isReady && publicKey) {
      const options: GameOptionsLocal = {
        language: 'en',
        proxy: 'wss://eu1.dustlabs.io/mtproxy', // Production WebSocket Proxy
        storagePolicy: 'indexeddb',
        minetestArgs: new MinetestArgs(),
        mode: 'local',
        gameId: 'mineclone2'
      };

      options.minetestArgs.go = true;
      options.minetestArgs.gameid = 'mineclone2';
      options.minetestArgs.address = '116.203.126.146';
      options.minetestArgs.port = 30000;
      options.minetestArgs.name = playerName;
      options.minetestArgs.password = 'Solcraft123'; // Wird für die Game-Session genutzt

      setGameOptions(options);
      setPlayState("playing");
    }
  };

  if (playState === "playing" && gameOptions) {
    return (
      <RuntimeScreen
        gameOptions={gameOptions}
        onGameStatus={(status) => {
          if (status === 'failed') setPlayState("dashboard");
        }}
        zipLoaderPromise={null}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full min-h-screen">
      {playState === "connect" && (
        <div className="bg-white/80 backdrop-blur-xl border border-border p-12 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-md w-full">
          <Wallet className="w-16 h-16 text-primary mb-6" />
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
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
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
    <main className="min-h-screen bg-background flex flex-col relative overflow-hidden text-foreground">
      {/* Abstract Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="absolute top-0 left-0 p-6 md:p-12 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-heading font-bold text-sm uppercase tracking-widest bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-border"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <GlobalProvider
        onExitDetected={() => window.location.reload()}
        onServerExitIntentDetected={() => { }}
      >
        <PlayPageContent />
      </GlobalProvider>
    </main>
  );
}