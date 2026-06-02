export default async function(sock, msg, comando, remetente) {
    await sock.sendMessage(remetente, {
        text: '📋 *LISTA DE COMANDOS DO BOT*:\n\n' +
            '📥 *Salvar mensagem*: Responda a uma mensagem com este emoji.\n' +
            '💾 *Salvar via reação*: Reaja a qualquer mensagem com este emoji.\n' +
            '📒 *Listar salvos*: Envie este emoji para exibir o conteúdo guardado.\n\n' +
            '📚 *Cronograma*: Exibe a grade horária da semana e o mural de avisos.\n' +
            '🚫 *Cancelar aulas*: Envie "🚫 Matéria" (aceita múltiplas matérias pulando linha).\n' +
            '🚫✅ *Restaurar aulas*: Limpa a lista e retoma todas as aulas ao normal.\n\n' +
            '💡 *Adicionar aviso*: Envie "💡 Matéria: Seu aviso aqui" (aceita múltiplas matérias pulando linha).\n' +
            '💡❌ *Limpar mural*: Apaga definitivamente todos os avisos do mural.\n\n' +
            '⚡ *Status*: Envie "ping" para checar a atividade do bot.'
    });
}