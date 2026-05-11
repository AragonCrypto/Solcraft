const express = require('express');
const path = require('path');
const app = express();

// Diese Header verhindern den SharedArrayBuffer-Crash (Black Screen)
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
});

// Sagt dem Server, dass er den www-Ordner ausliefern soll
app.use(express.static(path.join(__dirname, 'www')));

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});