const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// --- DAS HIER LÖST DAS BLACK-SCREEN PROBLEM (COOP/COEP HEADERS) ---
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
});

app.use(cors());
app.use(bodyParser.json());

// Dein Web3-Api Pfad
app.post('/api/mine-block', (req, res) => {
    console.log("Block mined!", req.body);
    res.json({ success: true });
});

// --- DAS HIER LIEFERT DEIN SPIEL AUS ---
// Gehe davon aus, dass dein "static" Ordner im selben Verzeichnis wie das Backend liegt
app.use('/static', express.static(path.join(__dirname, '../static')));

app.listen(4000, () => console.log('Web3 Backend & Game-Server läuft auf Port 4000'));