import fs from 'fs';

export default async function(sock, msg, comando, remetente) {
    if (fs.existsSync('avisos.json')) {
        fs.unlinkSync('avisos.json');
    }
    await sock.sendMessage(remetente, {
        react: { text: '✅', key: msg.key }
    });
}