import fs from 'fs';

export default async function(sock, msg, comando, remetente) {
    const mensagemCitadaInfo = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!mensagemCitadaInfo) {
        console.log('❌ Erro: Você precisa usar o comando respondendo a uma mensagem.');
        await sock.sendMessage(remetente, {
            react: { text: '❌', key: msg.key }
        });
        return;
    }

    const textoCitado = mensagemCitadaInfo.conversation || mensagemCitadaInfo.extendedTextMessage?.text;

    if (!textoCitado) {
        await sock.sendMessage(remetente, { text: '❌ Não consegui extrair texto dessa mensagem.' });
        return;
    }

    try {
        await sock.sendMessage(remetente, {
            react: { text: '✅', key: msg.key }
        });
        fs.writeFileSync('dados_salvos.txt', textoCitado, 'utf8');
        console.log("✅ Mensagem capturada e salva com sucesso.");
    } catch (erro) {
        console.error("Erro ao salvar arquivo:", erro);
    }
}