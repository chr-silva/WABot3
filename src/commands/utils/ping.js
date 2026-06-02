export default async function(sock, msg, comando, remetente) {
    await sock.sendMessage(remetente, { text: 'Bot ativo e funcionando corretamente!' });
}