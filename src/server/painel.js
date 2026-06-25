import { createServer } from 'http';
import { URL } from 'url';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { gerarHtmlLogin, gerarHtmlPainel } from './interface.js';
import { obterGruposPaginados } from './whatsappControl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function lerJsonRequisicao(req) {
    return new Promise((resolve, reject) => {
        let corpo = '';
        req.on('data', chunk => { corpo += chunk; });
        req.on('end', () => {
            try {
                resolve(corpo ? JSON.parse(corpo) : {});
            } catch (erro) {
                reject(new Error('JSON Inválido'));
            }
        });
    });
}

// 🛠️ Função para ler os comandos do projeto automaticamente
function lerComandosDoProjeto() {
    const categories = ['admin', 'general', 'utils'];
    const resultado = {};

    categories.forEach(cat => {
        const caminhoDir = path.resolve('src', 'commands', cat);
        if (fs.existsSync(caminhoDir)) {
            resultado[cat] = fs.readdirSync(caminhoDir).filter(file => file.endsWith('.js'));
        } else {
            resultado[cat] = [];
        }
    });

    return resultado;
}

// 🔑 Função auxiliar para ler cookies de uma requisição
function obterCookie(req, nome) {
    const lista = {}, rc = req.headers.cookie;
    if (rc) {
        rc.split(';').forEach(cookie => {
            const partes = cookie.split('=');
            lista[partes.shift().trim()] = decodeURI(partes.join('='));
        });
    }
    return lista[nome];
}

export function iniciarPainel(numeroDono, sock) {
    const PORT = process.env.PORT || 3000;
    const SENHA_MESTRA = process.env.PAINEL_SENHA || 'admin';
    const TOKEN_SECRETO = process.env.PAINEL_TOKEN_SECRETO || 'sessao_valida_dsbot';

    createServer(async (req, res) => { // 🎯 Adicionado async para usar await na leitura do JSON da API
        const minhaUrl = new URL(req.url, `http://${req.headers.host}`);
        
        // -------------------------------------------------------------
        // 📱 🔐 ROTAS DA API REST (EXCLUSIVAS PARA O APP FLUTTER)
        // Colocadas antes da verificação de sessão para não conflitar com o cookie web
        // -------------------------------------------------------------
        
        // Login do Aplicativo
        if (minhaUrl.pathname === '/api/login' && req.method === 'POST') {
            try {
                const { senha } = await lerJsonRequisicao(req);
                if (senha === SENHA_MESTRA) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ sucesso: true, mensagem: 'Conectado com sucesso!' }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ sucesso: false, mensagem: 'Senha mestra incorreta.' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ sucesso: false, mensagem: 'JSON Inválido enviado pelo app.' }));
            }
        }

        // Teste de Status do Bot via API
        if (minhaUrl.pathname === '/api/status' && req.method === 'GET') {
            const comandos = lerComandosDoProjeto();
            const totalComandos = comandos.admin.length + comandos.general.length + comandos.utils.length;
            
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({
                botStatus: "ONLINE",
                memoriaUsada: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB',`,
                tempoAtivo: `${Math.floor(process.uptime() / 60)} min`,
                totalComandos: totalComandos
            }));
        }


        // -------------------------------------------------------------
        // 🌐 FLUXO ANTIGO DO PAINEL WEB (HTML / COOKIES)
        // -------------------------------------------------------------
        const tokenUsuario = obterCookie(req, 'ds_session');
        const estaAutenticado = tokenUsuario === TOKEN_SECRETO;

        if (minhaUrl.pathname === '/logo.png') {
            const caminhoLogo = path.join(__dirname, '../../public/logo.png');
            
            if (fs.existsSync(caminhoLogo)) {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                const fluxoArquivo = fs.createReadStream(caminhoLogo);
                return fluxoArquivo.pipe(res);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                return res.end('Logo nao encontrada no disco');
            }
        }

        // Processar o formulário de Login Web
        if (minhaUrl.pathname === '/login' && req.method === 'POST') {
            let corpo = '';
            req.on('data', chunk => { corpo += chunk.toString(); });
            req.on('end', () => {
                const params = new URLSearchParams(corpo);
                const senhaDigitada = params.get('senha');

                if (senhaDigitada === SENHA_MESTRA) {
                    res.writeHead(302, {
                        'Set-Cookie': `ds_session=${TOKEN_SECRETO}; Path=/; HttpOnly; SameSite=Strict`,
                        'Location': '/'
                    });
                    return res.end();
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    return res.end(gerarHtmlLogin('Senha incorreta! Tente novamente.'));
                }
            });
            return;
        }

        // Se não estiver autenticado na Web e tentar qualquer outra rota web, barra e mostra login
        if (!estaAutenticado) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(gerarHtmlLogin());
        }

        // 🚪 Ação: Fazer Logout
        if (minhaUrl.pathname === '/logout' && req.method === 'POST') {
            res.writeHead(302, {
                'Set-Cookie': 'ds_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
                'Location': '/'
            });
            return res.end();
        }

        // 🗑️ Ação: Limpar arquivo de texto de notas
        if (minhaUrl.pathname === '/limpar' && req.method === 'POST') {
            if (fs.existsSync('dados_salvos.txt')) fs.unlinkSync('dados_salvos.txt');
            res.writeHead(302, { 'Location': '/' });
            return res.end();
        }

        // 🔄 Ação: Forçar reinício do bot
        if (minhaUrl.pathname === '/reiniciar' && req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Reiniciando o container do bot...');
            setTimeout(() => process.exit(0), 1000);
            return;
        }

        // 💡 Ação: Adicionar Aviso via Painel
        if (minhaUrl.pathname === '/postar-aviso' && req.method === 'POST') {
            let corpo = '';
            req.on('data', chunk => { corpo += chunk.toString(); });
            req.on('end', () => {
                const params = new URLSearchParams(corpo);
                const materia = params.get('materia')?.trim().toLowerCase();
                const aviso = params.get('aviso')?.trim();

                if (materia && aviso) {
                    let bancoAvisos = {};
                    if (fs.existsSync('avisos.json')) {
                        bancoAvisos = JSON.parse(fs.readFileSync('avisos.json', 'utf8'));
                    }
                    bancoAvisos[materia] = aviso;
                    fs.writeFileSync('avisos.json', JSON.stringify(bancoAvisos, null, 2), 'utf8');
                }
                res.writeHead(302, { 'Location': '/' });
                return res.end();
            });
            return;
        }

        // 💡 Ação: Limpar Mural de Avisos Completo
        if (minhaUrl.pathname === '/limpar-avisos' && req.method === 'POST') {
            if (fs.existsSync('avisos.json')) fs.unlinkSync('avisos.json');
            res.writeHead(302, { 'Location': '/' });
            return res.end();
        }

        // 🚫 Ação: Atualizar em Lote as Aulas Canceladas
        if (minhaUrl.pathname === '/atualizar-cancelamentos' && req.method === 'POST') {
            let corpo = '';
            req.on('data', chunk => { corpo += chunk.toString(); });
            req.on('end', () => {
                const params = new URLSearchParams(corpo);
                const selecionadas = [];
                for (const [key, value] of params.entries()) {
                    if (value === 'on') selecionadas.push(key);
                }

                if (selecionadas.length > 0) {
                    fs.writeFileSync('aula_cancelada.txt', selecionadas.join('\n'), 'utf8');
                } else {
                    if (fs.existsSync('aula_cancelada.txt')) fs.unlinkSync('aula_cancelada.txt');
                }

                res.writeHead(302, { 'Location': '/' });
                return res.end();
            });
            return;
        }

        // 🚫 Ação: Restaurar Todas as Aulas Canceladas
        if (minhaUrl.pathname === '/restaurar-aulas' && req.method === 'POST') {
            if (fs.existsSync('aula_cancelada.txt')) fs.unlinkSync('aula_cancelada.txt');
            res.writeHead(302, { 'Location': '/' });
            return res.end();
        }

        // 🚀 Ação Nova: Salvar pedido de disparo de mensagem
        if (minhaUrl.pathname === '/enviar-mensagem' && req.method === 'POST') {
            let corpo = '';
            req.on('data', chunk => { corpo += chunk.toString(); });
            req.on('end', () => {
                const params = new URLSearchParams(corpo);
                const grupoId = params.get('grupoId');
                const mensagem = params.get('mensagem')?.trim();

                if (grupoId && message) {
                    const dadosDisparo = { grupoId, mensagem, timestamp: Date.now() };
                    fs.writeFileSync('disparo.json', JSON.stringify(dadosDisparo, null, 2), 'utf8');
                }
                res.writeHead(302, { 'Location': '/' });
                return res.end();
            });
            return;
        }

        // 📄 Página Principal do Painel Web
        if (minhaUrl.pathname === '/') {
            let textoSalvo = "📂 Nenhum dado salvo ainda.";
            if (fs.existsSync('dados_salvos.txt')) {
                textoSalvo = fs.readFileSync('dados_salvos.txt', 'utf8');
            }

            let listaCanceladas = [];
            if (fs.existsSync('aula_cancelada.txt')) {
                listaCanceladas = fs.readFileSync('aula_cancelada.txt', 'utf8')
                    .split('\n').map(m => m.trim()).filter(m => m !== '');
            }

            let materiasDisponiveis = [];
            if (fs.existsSync('crono.json')) {
                try {
                    const cronoData = JSON.parse(fs.readFileSync('crono.json', 'utf8'));
                    const materiasSet = new Set();
                    Object.keys(cronoData).forEach(dia => {
                        if (Array.isArray(cronoData[dia])) {
                            cronoData[dia].forEach(aula => {
                                if (aula.materia) materiasSet.add(aula.materia.trim());
                            });
                        }
                    });
                    materiasDisponiveis = Array.from(materiasSet).sort();
                } catch (e) {
                    console.error("Erro ao ler crono.json:", e);
                }
            }

            const comandos = lerComandosDoProjeto();
            const totalComandos = comandos.admin.length + comandos.general.length + comandos.utils.length;

            const paginaAtual = parseInt(minhaUrl.searchParams.get('pg')) || 1;
            const gruposReais = obterGruposPaginados(sock, paginaAtual, 15);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(gerarHtmlPainel({
                numeroDono,
                totalComandos,
                comandos,
                materiasDisponiveis,
                listaCanceladas,
                textoSalvo,
                grupos: gruposReais,
                paginaAtual
            }));
        }

        // Rota não encontrada
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }).listen(PORT, () => {
        console.log(`🌍 Painel e API REST rodando juntos de forma segura na porta ${PORT}`);
    });
}