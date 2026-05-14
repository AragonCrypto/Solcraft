require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const cron = require('node-cron');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58').default || require('bs58');

const app = express();
const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
});
app.use(cors());
app.use(bodyParser.json());

// 1. Auth / Player Check
app.get('/api/auth/:phantomWallet', async (req, res) => {
    try {
        const { phantomWallet } = req.params;
        const result = await pool.query("SELECT player_name, backend_wallet_pubkey, game_mode, active_skin FROM players WHERE phantom_wallet = $1", [phantomWallet]);
        if (result.rows.length > 0) res.json({ exists: true, player: result.rows[0] });
        else res.json({ exists: false });
    } catch (err) { console.error("CRASH GRUND:", err); res.status(500).json({ error: "DB Error" }); }
});

// 2. Mint Player
app.post('/api/player/create', async (req, res) => {
    const { player_name, phantom_wallet, game_mode, tx_signature } = req.body;
    try {
        const nameCheck = await pool.query("SELECT id FROM players WHERE player_name = $1", [player_name]);
        if (nameCheck.rows.length > 0) return res.status(400).json({ success: false, error: "Name vergeben!" });
        if (!tx_signature) return res.status(400).json({ success: false, error: "Keine Signatur!" });

        const newKeypair = Keypair.generate();
        const pubkey = newKeypair.publicKey.toBase58();
        const privkey = bs58.encode(newKeypair.secretKey);

        const insertRes = await pool.query("INSERT INTO players (player_name, phantom_wallet, backend_wallet_pubkey, backend_wallet_privkey, game_mode) VALUES ($1, $2, $3, $4, $5) RETURNING id",[player_name, phantom_wallet, pubkey, privkey, game_mode]);
        await pool.query("INSERT INTO inventories (player_id, game_inventory, web3_inventory) VALUES ($1, '{}', '{}')", [insertRes.rows[0].id]);

        res.json({ success: true, player_name, backend_wallet: pubkey });
    } catch (err) { console.error("CRASH GRUND:", err); res.status(500).json({ error: "Mint Error" }); }
});

// 3. Inventory
app.get('/api/inventory/:phantomWallet', async (req, res) => {
    try {
        const result = await pool.query("SELECT i.game_inventory, i.web3_inventory FROM inventories i JOIN players p ON i.player_id = p.id WHERE p.phantom_wallet = $1",[req.params.phantomWallet]);
        if (result.rows.length > 0) res.json({ success: true, data: result.rows[0] });
        else res.json({ success: false });
    } catch (err) { console.error("CRASH GRUND:", err); res.status(500).json({ error: "DB Error" }); }
});

// 4. NFTs
app.get('/api/nfts/:phantomWallet', async (req, res) => {
    res.json({ success: true, nfts:[
        { id: "default", name: "Default Skin", image: "/assets/skins/default.png" },
        { id: "premium_1", name: "Premium Skin", image: "/assets/skins/premium.png" }
    ]});
});

// 5. Equip Skin
app.post('/api/player/skin', async (req, res) => {
    try {
        await pool.query("UPDATE players SET active_skin = $1 WHERE phantom_wallet = $2", [req.body.skin_id, req.body.phantom_wallet]);
        res.json({ success: true });
    } catch (err) { console.error("CRASH GRUND:", err); res.status(500).json({ error: "Skin Error" }); }
});

// 6. Game Sync
app.post('/api/sync-game', async (req, res) => {
    console.log(`[SYNC-PING] Empfange Daten von ${req.body?.player_name}:`, req.body?.current_inventory);

    const { player_name, current_inventory } = req.body;
    try {
        const playerRes = await pool.query("SELECT id, backend_wallet_privkey, game_mode, active_skin FROM players WHERE player_name = $1",[player_name]);
        if (playerRes.rows.length === 0) return res.json({ success: true, pending_injections:[], active_skin: "default" });
        const player = playerRes.rows[0];
        
        if (player.game_mode === 'LIQUID') {
            const invRes = await pool.query("SELECT game_inventory FROM inventories WHERE player_id = $1",[player.id]);
            const anchorInventory = invRes.rows.length > 0 ? invRes.rows[0].game_inventory : {};

            for (const [itemName, currentAmount] of Object.entries(current_inventory)) {
                const anchorAmount = anchorInventory[itemName] || 0;
                const diff = currentAmount - anchorAmount;
                if (diff > 0) await pool.query("INSERT INTO sync_operations (player_id, wallet_privkey, item_name, amount, action_type) VALUES ($1, $2, $3, $4, 'MINT')",[player.id, player.backend_wallet_privkey, itemName, diff]);
                else if (diff < 0) await pool.query("INSERT INTO sync_operations (player_id, wallet_privkey, item_name, amount, action_type) VALUES ($1, $2, $3, $4, 'BURN')",[player.id, player.backend_wallet_privkey, itemName, Math.abs(diff)]);
            }
            for (const[itemName, anchorAmount] of Object.entries(anchorInventory)) {
                if (!current_inventory[itemName] && anchorAmount > 0) await pool.query("INSERT INTO sync_operations (player_id, wallet_privkey, item_name, amount, action_type) VALUES ($1, $2, $3, $4, 'BURN')",[player.id, player.backend_wallet_privkey, itemName, anchorAmount]);
            }
        }

        const pendingRes = await pool.query("SELECT id, item_name, amount FROM sync_operations WHERE player_id = $1 AND action_type = 'GIVE_IN_GAME' AND status = 'PENDING'",[player.id]);
        for (const inj of pendingRes.rows) {
            current_inventory[inj.item_name] = (current_inventory[inj.item_name] || 0) + inj.amount;
            await pool.query("UPDATE sync_operations SET status = 'DONE' WHERE id = $1", [inj.id]);
        }

        await pool.query("INSERT INTO inventories (player_id, game_inventory) VALUES ($1, $2) ON CONFLICT (player_id) DO UPDATE SET game_inventory = $2, last_updated = CURRENT_TIMESTAMP",[player.id, JSON.stringify(current_inventory)]);
        res.json({ success: true, pending_injections: pendingRes.rows, active_skin: player.active_skin });
    } catch (err) { console.error("CRASH GRUND:", err); res.status(500).json({ error: "Server error" }); }
});

cron.schedule('* * * * *', async () => {
    const pendingOps = await pool.query("SELECT * FROM sync_operations WHERE status = 'PENDING' AND action_type IN ('MINT', 'BURN')");
    for (const op of pendingOps.rows) {
        await pool.query("UPDATE sync_operations SET status = 'PROCESSING' WHERE id = $1", [op.id]);
        try {
            const invRes = await pool.query("SELECT web3_inventory FROM inventories WHERE player_id = $1", [op.player_id]);
            let web3Inv = invRes.rows.length > 0 ? invRes.rows[0].web3_inventory : {};
            
            if (op.action_type === 'MINT') web3Inv[op.item_name] = (web3Inv[op.item_name] || 0) + op.amount;
            else if (op.action_type === 'BURN') web3Inv[op.item_name] = Math.max(0, (web3Inv[op.item_name] || 0) - op.amount);

            await pool.query("INSERT INTO inventories (player_id, web3_inventory) VALUES ($1, $2) ON CONFLICT (player_id) DO UPDATE SET web3_inventory = $2",[op.player_id, JSON.stringify(web3Inv)]);
            await pool.query("UPDATE sync_operations SET status = 'DONE' WHERE id = $1",[op.id]);
        } catch (error) { await pool.query("UPDATE sync_operations SET status = 'ERROR' WHERE id = $1",[op.id]); }
    }
});

app.listen(4000, '127.0.0.1', () => console.log('Backend laeuft auf 127.0.0.1:4000!'));