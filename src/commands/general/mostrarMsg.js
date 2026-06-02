import fs from 'fs';

export default async function(sock, msg, comando, remetente) {
    if (!fs.existsSync('dados_salvos.txt')) {
        const msgErro = await sock.sendMessage(remetente, { text: '📂 Verificando...' });
        setTimeout(async () => {
            await sock.sendMessage(remetente, { text: '❌ Nenhum dado foi salvo ainda!', edit: msgErro.key });
            await sock.sendMessage(remetente, { react: { text: '❌', key: msg.key } });
        }, 670);
        return;
    }

    try {
        const textoGuardado = fs.readFileSync('dados_salvos.txt', 'utf8');
        const msgStatus = await sock.sendMessage(remetente, { text: '🔄 Carregando conteúdo salvo...' });

        setTimeout(async () => {
            await sock.sendMessage(remetente, { text: textoGuardado, edit: msgStatus.key });
            await sock.sendMessage(remetente, { react: { text: '✅', key: msg.key } });
        }, 670);
    } catch (erro) {
        console.error("Erro ao ler/editar arquivo:", erro);
    }
}