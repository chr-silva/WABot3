import fs from 'fs';

export default async function(sock, msg, comando, remetente) {
    try {
        let canceladas = [];
        if (fs.existsSync('aula_cancelada.txt')) {
            const conteudoTxt = fs.readFileSync('aula_cancelada.txt', 'utf8');
            canceladas = conteudoTxt.split('\n').map(m => m.trim().toLowerCase()).filter(m => m !== '');
        }

        const textoCompleto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const linhas = textoCompleto.split('\n');
        let processados = 0;

        linhas.forEach(linha => {
            const materia = linha.replace('🚫', '').trim().toLowerCase();
            if (!materia) return;

            if (!canceladas.includes(materia)) {
                canceladas.push(materia);
            }
            processados++;
        });

        if (processados > 0) {
            fs.writeFileSync('aula_cancelada.txt', canceladas.join('\n'), 'utf8');
            await sock.sendMessage(remetente, {
                react: { text: '🚫', key: msg.key }
            });
        }
    } catch (err) {
        console.error("Erro ao salvar cancelamentos:", err);
    }
}