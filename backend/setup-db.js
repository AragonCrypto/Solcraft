require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function setupDb() {
    try {
        console.log("Erstelle Tabelle: players...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                player_name VARCHAR(255) UNIQUE NOT NULL,
                phantom_wallet VARCHAR(255) UNIQUE NOT NULL,
                backend_wallet_pubkey VARCHAR(255),
                backend_wallet_privkey VARCHAR(255),
                game_mode VARCHAR(50),
                active_skin VARCHAR(100) DEFAULT 'default'
            );
        `);

        console.log("Erstelle Tabelle: inventories...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventories (
                player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
                game_inventory JSONB DEFAULT '{}',
                web3_inventory JSONB DEFAULT '{}',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Erstelle Tabelle: sync_operations...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sync_operations (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                wallet_privkey VARCHAR(255),
                item_name VARCHAR(255),
                amount INTEGER,
                action_type VARCHAR(50),
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ DATENBANK ERFOLGREICH EINGERICHTET!");
        process.exit(0);
    } catch (err) {
        console.error("❌ FEHLER BEIM ERSTELLEN DER DATENBANK:", err);
        process.exit(1);
    }
}
setupDb();
