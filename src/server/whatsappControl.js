import fs from 'fs';

// Guardará o tempo do último disparo por grupo para o Anti-Spam
const cooldowns = new Map();

/**
 * Puxa os grupos da memória do bot com filtros de segurança e performance
 * @param {Object} sock - A instância de conexão do bot (Baileys)
 * @param {Number} pagina - Página atual da paginação
 * @param {Number} limite - Quantidade de grupos por lote
 */
export function obterGruposPaginados(sock, pagina = 1, limite = 15) {
    const meusGruposManuais = [
        { id:  "120363408047968278@g.us", nome: "🛠️ Grupo de Testes do Bot" },
        // { id: "@g.us", nome: "📢 Mural de Avisos - Geral" },
        // { id: "@g.us", nome: "🛠️ Grupo de Testes do Bot" }
    ];

    try {
        // Paginação simples em cima da sua lista manual
        const indiceInicio = (pagina - 1) * limite;
        const indiceFim = indiceInicio + limite;
        
        return meusGruposManuais.slice(indiceInicio, indiceFim);

    } catch (erro) {
        console.error("❌ Erro ao ler lista manual de grupos:", erro);
        return [];
    }
}
/**
 * Escuta o arquivo disparo.json para enviar mensagens em segundo plano com Rate Limiting
 * @param {Object} sock - A instância de conexão do bot
 */
export function iniciarWatchdogDeDisparos(sock) {
    const caminhoDisparo = './disparo.json';

    // Checa o arquivo a cada 3 segundos
    setInterval(async () => {
        if (!fs.existsSync(caminhoDisparo)) return;

        try {
            const dados = JSON.parse(fs.readFileSync(caminhoDisparo, 'utf8'));
            
            // Verifica o Anti-Spam (Bloqueia se disparar no mesmo grupo em menos de 5 segundos)
            const ultimoEnvio = cooldowns.get(dados.grupoId) || 0;
            if (Date.now() - ultimoEnvio < 5000) {
                console.warn(`⚠️ [Anti-Spam] Disparo bloqueado para o grupo ${dados.grupoId}. Aguarde.`);
                fs.unlinkSync(caminhoDisparo); // Apaga para destravar
                return;
            }

            // Atualiza o cooldown do grupo e envia
            cooldowns.set(dados.grupoId, Date.now());
            
            await sock.sendMessage(dados.grupoId, { text: dados.mensagem });
            console.log(`🚀 [Painel] Mensagem disparada com sucesso no grupo: ${dados.grupoId}`);

            // Remove o arquivo de gatilho após o envio com sucesso
            fs.unlinkSync(caminhoDisparo);

        } catch (erro) {
            console.error('❌ Erro no watchdog de disparos:', erro);
            if (fs.existsSync(caminhoDisparo)) fs.unlinkSync(caminhoDisparo);
        }
    }, 3000);
}