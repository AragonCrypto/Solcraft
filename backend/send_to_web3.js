require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function sendToWeb3(playerName, itemName, amount) {
    try {
        const playerRes = await pool.query("SELECT id FROM players WHERE player_name = $1", [playerName]);
        if (playerRes.rows.length === 0) return console.log(`❌ Spieler '${playerName}' nicht gefunden.`);
        const playerId = playerRes.rows[0].id;
        const parsedAmount = parseInt(amount);

        // 1. Ins Web3 Inventar hinzufügen
        const invRes = await pool.query("SELECT web3_inventory FROM inventories WHERE player_id = $1", [playerId]);
        let web3Inv = invRes.rows.length > 0 ? invRes.rows[0].web3_inventory : {};
        web3Inv[itemName] = (web3Inv[itemName] || 0) + parsedAmount;

        await pool.query("INSERT INTO inventories (player_id, web3_inventory) VALUES ($1, $2) ON CONFLICT (player_id) DO UPDATE SET web3_inventory = $2", [playerId, JSON.stringify(web3Inv)]);

        // 2. Das Item an den Game-Server pushen (Warteschlange)
        await pool.query("INSERT INTO sync_operations (player_id, item_name, amount, action_type) VALUES ($1, $2, $3, 'GIVE_IN_GAME')", [playerId, itemName, parsedAmount]);

        console.log(`✅ ${amount}x '${itemName}' an Web3-Wallet gesendet und für Lieferung ans Spiel vorbereitet!`);
    } catch (err) {
        console.error("❌ Fehler:", err.message);
    } finally { pool.end(); }
}

const[,, name, item, qty] = process.argv;
if (!name || !item || !qty) process.exit(1);
sendToWeb3(name, item, qty);
