import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs'; 

const NUMERO_DONO = '5591988746023'; 

// 🧠 Cache na memória para guardar temporariamente o texto das últimas mensagens recebidas
const cacheMensagens = new Map();

async function conectarBot() {

    import http from 'http';
    const PORT = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Bot Online!');
    }).listen(PORT, () => {
        console.log(`🌍 Servidor de validação rodando na porta ${PORT}`);
    });

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
                const codigo = await sock.requestPairingCode(NUMERO_DONO);
                console.log(`\n========================================`);
                console.log(`📱 SEU CÓDIGO DE PAREAMENTO: ${codigo}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error("Erro ao gerar código de pareamento:", err);
            }
        }, 3000);
    }

    // --- 👀 OUVINTE DE REAÇÕES (Invisível e Seguro) ---
    sock.ev.on('messages.reaction', async (reactions) => {
        const reac = reactions[0];
        if (!reac || !reac.reaction) return;

        // 🔒 Segurança: Garante que a reação veio de você
        if (!reac.reaction.key.fromMe) return;

        const emojiGatilho = '💾';

        if (reac.reaction.text === emojiGatilho) {
            const chatRemetente = reac.key.remoteJid;
            const idMensagemReagida = reac.key.id;

            // Busca o texto direto no nosso cache local pelo ID da mensagem
            const textoReagido = cacheMensagens.get(idMensagemReagida);

            if (textoReagido) {
                try {
                    fs.writeFileSync('dados_salvos.txt', textoReagido, 'utf8');
                    console.log("✅ Mensagem capturada via reação e salva localmente.");

                    // Reage com check para confirmar o sucesso
                    await sock.sendMessage(chatRemetente, {
                        react: { text: '✅', key: reac.key }
                    });
                } catch (erro) {
                    console.error("Erro ao salvar arquivo de reação:", erro);
                }
            } else {
                sock.sendMessage(chatRemetente, {
                    react: { text: '❌', key: reac.key }
                });
                console.log("⚠️ Mensagem não encontrada no cache local (muito antiga ou recebida antes do bot ligar).");
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

        // 🧠 Alimenta o cache com toda mensagem de texto que passa pelo bot
        if (texto) {
            cacheMensagens.set(idMensagem, texto);
            
            // Limpa mensagens antigas do cache para não estourar a memória do celular (mantém as últimas 100)
            if (cacheMensagens.size > 100) {
                const primeiraChave = cacheMensagens.keys().next().value;
                cacheMensagens.delete(primeiraChave);
            }
        }

        // 🔒 Segurança: Só responde aos comandos se a mensagem veio de você
        if (!deMim) return;

        if (texto.startsWith('.')) {
            const comando = texto.slice(1).trim().toLowerCase();

            // 💾 Comando .s (respondendo a uma mensagem manualmente)
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
                    console.log("✅ Mensagem capturada e salva localmente com sucesso.");
                } catch (erro) {
                    console.error("Erro ao salvar arquivo:", erro);
                    await sock.sendMessage(remetente, { text: '❌ Erro interno ao tentar gravar o arquivo localmente.' });
                }
            }

            // 📤 Comando .l (recupera o que está gravado no arquivo)
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

conectarBot();