import fs from 'fs';

// Exportando o cache para que o messageHandler também possa alimentá-lo
export const cacheMensagens = new Map();
const REAC_EMOJI_SALVAR = '💾';
const REAC_EMOJI_FIXAR = '📌'; 

export async function reactionHandler(sock, reactions) {
    const reac = reactions[0];
    if (!reac || !reac.reaction) return;
    if (!reac.reaction.key.fromMe) return; // Só funciona se VOCÊ reagir

    // 🛠️ CORREÇÃO DEFINITIVA: voltando para reac.key (dados da mensagem original)
    const idMensagemReagida = reac.key.id; 
    const chatRemetente = reac.key.remoteJid;

    // ==========================================
    // 💾 SISTEMA DE SALVAR MENSAGEM EXISTENTE
    // ==========================================
    if (reac.reaction.text === REAC_EMOJI_SALVAR) {
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
            console.log("⚠️ Mensagem não encontrada no cache local (antiga ou bot offline).");
        }
    }

    // ==========================================
    // (e) SISTEMA DE
    // ==========================================
    // if (reac.reaction.text === reac_emoji_x) {}
    // 
}