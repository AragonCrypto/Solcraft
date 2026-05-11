import { NextResponse } from 'next/server';

// NUTZE DIE HTTPS DOMAIN (UMGEHT FIREWALL-TIMEOUTS)
const HETZNER_IP = "https://api.solcraft.me";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { endpoint, method = 'GET', payload } = body;

        const url = `${HETZNER_IP}${endpoint}`;

        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (payload && method !== 'GET') {
            options.body = JSON.stringify(payload);
        }

        // Server-to-Server Anfrage (ignoriert Chrome-Sicherheitsblockaden!)
        const response = await fetch(url, options);

        // Wenn Hetzner keinen JSON liefert, fangen wir das ab
        const data = await response.json().catch(() => ({}));

        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error("[RELAY ERROR]", error.message);
        return NextResponse.json({ error: "Hetzner Server nicht erreichbar (Timeout / Firewall)" }, { status: 504 });
    }
}