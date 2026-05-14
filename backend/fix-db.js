require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT,
});

async function fixDb() {
    try {
        console.log("Lösche fehlerhafte Tabellen...");
        await pool.query('DROP TABLE IF EXISTS sync_operations, inventories, players CASCADE;');
        
        console.log("Erstelle frische, perfekte Tabellen...");
        await pool.query(`
            CREATE TABLE players (
                id SERIAL PRIMARY KEY,
                player_name VARCHAR(255) UNIQUE NOT NULL,
                phantom_wallet VARCHAR(255) UNIQUE NOT NULL,
                backend_wallet_pubkey VARCHAR(255),
                backend_wallet_privkey VARCHAR(255),
                game_mode VARCHAR(50),
                active_skin VARCHAR(100) DEFAULT 'default'
            );
            CREATE TABLE inventories (
                player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
                game_inventory JSONB DEFAULT '{}',
                web3_inventory JSONB DEFAULT '{}',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE sync_operations (
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
        console.log("✅ DATENBANK IST JETZT PERFEKT!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Fehler:", err);
        process.exit(1);
    }
}
fixDb();
