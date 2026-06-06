import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { msgHandler } from '../handlers/msgHandler.js';
import { reactionHandler } from '../handlers/reactionHandler.js';
import { iniciarPainel } from '../server/painel.js';
import { iniciarWatchdogDeDisparos } from '../server/whatsappControl.js';

let painelJaIniciado = false;

export async function conectarBot(numeroDono) {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_bot');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    // Código de Pareamento por número
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const numeroLimpo = numeroDono.replace(/[^0-9]/g, '');
                const codigo = await sock.requestPairingCode(numeroLimpo);
                console.log(`\n========================================`);
                console.log(`📱 SEU CÓDIGO DE PAREAMENTO: ${codigo}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error("Erro ao gerar código de pareamento:", err);
            }
        }, 5000);
    }

    // Encaminha os eventos para os manipuladores isolados
    sock.ev.on('messages.reaction', async (reactions) => reactionHandler(sock, reactions));
    sock.ev.on('messages.upsert', async (chatUpdate) => msgHandler(sock, chatUpdate));

    // Gerenciador de conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const deveReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (deveReconectar) conectarBot(numeroDono);
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
            if (!painelJaIniciado) {
                iniciarPainel(numeroDono, sock);
                iniciarWatchdogDeDisparos(sock);
                painelJaIniciado = true; // Ativa a trava
                console.log('🌐 Painel administrativo e monitor de disparos iniciados.');
            } else {
                console.log('🌐 Bot reconectado. Mantendo o painel HTTP na porta atual.');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}