import fs from 'fs';

export default async function(sock, msg, comando, remetente) {
    try {
        let bancoAvisos = {};
        if (fs.existsSync('avisos.json')) {
            bancoAvisos = JSON.parse(fs.readFileSync('avisos.json', 'utf8'));
        }

        const textoCompleto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const linhas = textoCompleto.split('\n');
        let avisosProcessados = 0;

        linhas.forEach(linha => {
            const linhaLimpa = linha.replace('💡', '').trim();
            if (!linhaLimpa) return;

            const partes = linhaLimpa.split(':');
            if (partes.length < 2) return;

            const materiaAlvo = partes[0].trim().toLowerCase();
            const textoAviso = partes.slice(1).join(':').trim();

            if (textoAviso.toLowerCase() === 'remover' || textoAviso === '') {
                delete bancoAvisos[materiaAlvo];
            } else {
                bancoAvisos[materiaAlvo] = textoAviso;
            }
            avisosProcessados++;
        });

        if (avisosProcessados === 0) {
            await sock.sendMessage(remetente, {
                text: '❌ Nenhum aviso válido encontrado. Use o formato: `💡 Matéria: Aviso`.'
            });
            return;
        }

        fs.writeFileSync('avisos.json', JSON.stringify(bancoAvisos, null, 2), 'utf8');
        await sock.sendMessage(remetente, {
            react: { text: '💡', key: msg.key }
        });
    } catch (err) {
        console.error("Erro ao salvar múltiplos avisos:", err);
    }
}