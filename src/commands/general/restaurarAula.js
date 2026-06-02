import fs from 'fs';

export default async function(sock, msg, comando, remetente) {
    if (fs.existsSync('aula_cancelada.txt')) {
        fs.unlinkSync('aula_cancelada.txt');
    }
    await sock.sendMessage(remetente, {
        react: { text: '✅', key: msg.key }
    });
}