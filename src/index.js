import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs'; 
import { iniciarPainel } from './server/painel.js'; // 🌍 Importa o painel modularizado

// Volta o número original com o 9º dígito como estava antes
const NUMERO_DONO = '5591988746023'; 

// 🧠 Cache na memória para guardar temporariamente o texto das últimas mensagens
const cacheMensagens = new Map();

async function conectarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_bot');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    // 🔑 --- LÓGICA DO CÓDIGO DE PAREAMENTO ---
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const numeroLimpo = NUMERO_DONO.replace(/[^0-9]/g, '');
                const codigo = await sock.requestPairingCode(numeroLimpo);
                console.log(`\n========================================`);
                console.log(`📱 SEU CÓDIGO DE PAREAMENTO: ${codigo}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error("Erro ao gerar código de pareamento:", err);
            }
        }, 5000); // 5 segundos está ótimo para estabilizar
    }

    // --- 👀 OUVINTE DE REAÇÕES (Invisível e Seguro) ---
    sock.ev.on('messages.reaction', async (reactions) => {
        const reac = reactions[0];
        if (!reac || !reac.reaction) return;

        if (!reac.reaction.key.fromMe) return;

        const emojiGatilho = '💾';

        if (reac.reaction.text === emojiGatilho) {
            const chatRemetente = reac.key.remoteJid;
            const idMensagemReagida = reac.key.id;

            const textoReagido = cacheMensagens.get(idMensagemReagida);

            if (textoReagido) {
                try {
                    fs.writeFileSync('dados_salvos.txt', textoReagido, 'utf8');
                    console.log("✅ Mensagem capturada via reação e salva localmente.");

                    await sock.sendMessage(chatRemetente, {
                        react: { text: '✅', key: reac.key }
                    });
                } catch (erro) {
                    console.error("Erro ao salvar arquivo de reação:", erro);
                }
            } else {
                console.log("⚠️ Mensagem não encontrada no cache local (antiga ou recebida com bot off).");
            }
        }
    });

    // --- 💬 LEITOR DE MENSAGENS E COMANDOS ---
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const msg = messages[0];
        if (!msg.message) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const remetente = msg.key.remoteJid;
        const deMim = msg.key.fromMe;
        const idMensagem = msg.key.id;

        if (texto) {
            cacheMensagens.set(idMensagem, texto);
            if (cacheMensagens.size > 100) {
                const primeiraChave = cacheMensagens.keys().next().value;
                cacheMensagens.delete(primeiraChave);
            }
        }

        if (!deMim) return;

        if (texto.startsWith('.')) {
            const comando = texto.slice(1).trim().toLowerCase();

            // 💾 Comando .s
            if (comando === 's') {
                const mensagemCitadaInfo = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

                if (!mensagemCitadaInfo) {
                    await sock.sendMessage(remetente, { text: '❌ Erro: Você precisa usar o comando `.s` respondendo a uma mensagem.' });
                    return;
                }

                const textoCitado = mensagemCitadaInfo.conversation || mensagemCitadaInfo.extendedTextMessage?.text;

                if (!textoCitado) {
                    await sock.sendMessage(remetente, { text: '❌ Não consegui extrair texto dessa mensagem.' });
                    return;
                }

                try {
                    fs.writeFileSync('dados_salvos.txt', textoCitado, 'utf8');
                    console.log("✅ Mensagem capturada e salva com sucesso.");
                } catch (erro) {
                    console.error("Erro ao salvar arquivo:", erro);
                }
            }

            // 📤 Comando .l
            if (comando === 'l') {
                if (!fs.existsSync('dados_salvos.txt')) {
                    console.log("📂 Nenhum dado foi salvo ainda!");
                    return;
                }

                try {
                    const textoGuardado = fs.readFileSync('dados_salvos.txt', 'utf8');
                    await sock.sendMessage(remetente, { text: textoGuardado });
                } catch (erro) {
                    console.error("Erro ao ler arquivo:", erro);
                }
            }

            // Comando .ping
            if (comando === 'ping') {
                await sock.sendMessage(remetente, { text: 'Pong! O bot está ativo.' });
            }
        }
    });

    // --- GERENCIADOR DE CONEXÃO ---
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const deveReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (deveReconectar) conectarBot();
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// 🌍 ATENÇÃO: O painel agora liga aqui fora, UMA ÚNICA VEZ, evitando o erro de porta ocupada
iniciarPainel(NUMERO_DONO);

// Liga o bot de forma independente
conectarBot();