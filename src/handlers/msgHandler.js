import { cacheMensagens } from './reactionHandler.js';
import path from 'path';


// 🛡️ Travas de segurança e controle de fluxo
const idsProcessados = new Set();
const comandosRecentes = new Map();

// 🗺️ Mapeamento de Comandos (Substitui o if/else gigante)
const MAPA_COMANDOS = {
    '📥': 'general/salvarMsg.js',
    '📒': 'general/mostrarMsg.js',
    'ping': 'utils/ping.js',
    'cmd': 'general/cmdLista.js',
    '📚': 'general/cronograma.js',
    '🚫✅': 'general/restaurarAula.js',
    '💡❌': 'admin/limpar_aviso.js',
};


// Gerencia o cache local das últimas 100 mensagens
function gerenciarCacheMensagem(id, texto) {
    if (!texto) return;
    cacheMensagens.set(id, texto);
    if (cacheMensagens.size > 100) {
        const primeiraChave = cacheMensagens.keys().next().value;
        cacheMensagens.delete(primeiraChave);
    }
}

// Identifica o comando correspondente ao texto enviado
function obterNomeComando(texto) {
    if (MAPA_COMANDOS[texto]) return MAPA_COMANDOS[texto];
    if (texto.startsWith('🚫 ')) return 'general/cancelarAula.js';
    if (texto.startsWith('💡 ')) return 'admin/adicionar_aviso.js';
    return null;
}

export async function msgHandler(sock, { messages, type }) {
    const msg = messages[0];
    if (type !== 'notify' || !messages?.[0]?.message) return;
    if (!msg || !msg.message) return;
    const { protocolMessage, senderKeyDistributionMessage } = msg.message;
    
    // const idDoChat = msg.key?.remoteJid;
    // if (idDoChat && idDoChat.endsWith('@g.us')) {
    //     console.log(`📋 [ID DO GRUPO]: ${idDoChat} | Remetente: ${msg.pushName || 'Desconhecido'}`);
    // }

    
    // Filtros de segurança contra pacotes fantasmas
    if (protocolMessage || senderKeyDistributionMessage || msg.labels?.length > 0) return;

    const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
    const { remoteJid: remetente, fromMe: deMim, id: idMensagem } = msg.key;

    gerenciarCacheMensagem(idMensagem, texto);

    // Validações iniciais (Self-bot e duplicidade do Baileys)
    if (!deMim || idsProcessados.has(idMensagem) || !texto) return;

    const comandoNome = obterNomeComando(texto);
    if (!comandoNome) return;

    // Controle de Anti-flood (Duplicidade extrema)
    const chaveComando = `${remetente}_${texto}`;
    const agora = Date.now();
    if (comandosRecentes.has(chaveComando) && (agora - comandosRecentes.get(chaveComando) < 3000)) return;

    // Ativa as travas de segurança
    idsProcessados.add(idMensagem);
    comandosRecentes.set(chaveComando, agora);

    try {
        const caminhoComando = path.resolve('src', 'commands', comandoNome);
        const { default: comandoModulo } = await import(`file://${caminhoComando}`);
        await comandoModulo(sock, msg, texto, remetente);
    } catch (erro) {
        console.error(`Erro ao executar [${comandoNome}]:`, erro);
    } finally {
        // Limpeza de memória agendada
        setTimeout(() => {
            idsProcessados.delete(idMensagem);
            comandosRecentes.delete(chaveComando);
        }, 10000);
    }
}