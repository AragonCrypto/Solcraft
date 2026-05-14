const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { mintTo, getOrCreateAssociatedTokenAccount, createMint } = require('@solana/spl-token');
const bs58 = require('bs58').default || require('bs58');

// Nutze Devnet (Kostenlos!)
const connection = new Connection("https://api.devnet.solana.com", 'confirmed');

// Deine Backend-Master-Wallet (die die Gebühren im Devnet zahlt - hol dir airdrops auf solfaucet.com)
// Für den Hackathon generieren wir on-the-fly eine temporäre Mint-Authority
const masterKeypair = Keypair.generate(); 

async function mintItemToPlayer(playerWalletAddress, amount) {
    try {
        const playerPublicKey = new PublicKey(playerWalletAddress);
        
        // 1. Erstelle einen Token (In einer echten App würde man das nur 1x pro Item machen)
        const mint = await createMint(connection, masterKeypair, masterKeypair.publicKey, null, 0);
        
        // 2. Finde die Token-Wallet des Spielers
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection, masterKeypair, mint, playerPublicKey
        );

        // 3. Minte die Anzahl an Tokens in seine Wallet
        await mintTo(
            connection, masterKeypair, mint, tokenAccount.address, masterKeypair, amount
        );
        
        console.log(`✅ ${amount} Token erfolgreich an ${playerWalletAddress} gemintet!`);
        return true;
    } catch (error) {
        console.error("❌ Solana Mint Error:", error);
        return false;
    }
}

module.exports = { mintItemToPlayer };
