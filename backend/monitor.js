require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkDatabase() {
    try {
        console.log("\n=========================================");
        console.log("🕹️  SOLCRAFT HACKATHON MONITOR 🕹️");
        console.log("=========================================\n");

        // 1. Spieler abrufen
        console.log("--- REGISTRIERTE SPIELER ---");
        const players = await pool.query("SELECT id, player_name, game_mode FROM players");
        if (players.rows.length === 0) console.log("Keine Spieler gefunden.");
        else console.table(players.rows);

        // 2. Inventare abrufen
        console.log("\n--- INVENTARE (GAME VS WEB3) ---");
        const invs = await pool.query(`
            SELECT p.player_name, i.game_inventory, i.web3_inventory, i.last_updated 
            FROM inventories i 
            JOIN players p ON i.player_id = p.id
        `);
        
        if (invs.rows.length === 0) {
            console.log("Noch keine Inventar-Daten synchronisiert.");
        } else {
            invs.rows.forEach(row => {
                console.log(`\n👤 Spieler: ${row.player_name} (Zuletzt geupdatet: ${row.last_updated.toLocaleTimeString()})`);
                console.log(`🎮 Game-Inventar:`, row.game_inventory);
                console.log(`⛓️  Web3-Inventar:`, row.web3_inventory);
            });
        }

        // 3. Ausstehende Transaktionen
        console.log("\n--- AUSSTEHENDE SOLANA TRANSAKTIONEN ---");
        const ops = await pool.query("SELECT player_id, item_name, amount, action_type, status FROM sync_operations WHERE status != 'DONE'");
        if (ops.rows.length === 0) console.log("Keine anstehenden Transaktionen. Alles synchron!");
        else console.table(ops.rows);

    } catch (err) {
        console.error("Fehler beim Abfragen der Datenbank:", err.message);
    } finally {
        pool.end();
    }
}

checkDatabase();
