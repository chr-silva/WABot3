import { createServer } from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// Função auxiliar para mapear dinamicamente os arquivos da sua pasta 'src/commands'
function lerComandosDoProjeto() {
    const categorias = ['admin', 'general', 'utils'];
    const resultado = {};

    categorias.forEach(cat => {
        const caminhoDir = path.resolve('src', 'commands', cat);
        if (fs.existsSync(caminhoDir)) {
            resultado[cat] = fs.readdirSync(caminhoDir).filter(file => file.endsWith('.js'));
        } else {
            resultado[cat] = [];
        }
    });

    return resultado;
}

export function iniciarPainel(numeroDono) {
    const PORT = process.env.PORT || 3000;

    createServer((req, res) => {
        const minhaUrl = new URL(req.url, `http://${req.headers.host}`);
        
        // 🗑️ Ação: Limpar o arquivo de texto
        if (minhaUrl.pathname === '/limpar' && req.method === 'POST') {
            try {
                if (fs.existsSync('dados_salvos.txt')) fs.unlinkSync('dados_salvos.txt');
                res.writeHead(302, { 'Location': '/' });
                return res.end();
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('Erro ao limpar o arquivo.');
            }
        }

        // 🔄 Ação Nova: Forçar reinício do processo (Útil no Render)
        if (minhaUrl.pathname === '/reiniciar' && req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Reiniciando o container do bot...');
            setTimeout(() => process.exit(0), 1000); // O Render reinicia automaticamente ao cair
            return;
        }

        // 📄 Página Principal do Painel
        if (minhaUrl.pathname === '/') {
            let textoSalvo = "📂 Nenhum dado salvo ainda.";
            if (fs.existsSync('dados_salvos.txt')) {
                textoSalvo = fs.readFileSync('dados_salvos.txt', 'utf8');
            }

            const comandos = lerComandosDoProjeto();
            const totalComandos = comandos.admin.length + comandos.general.length + comandos.utils.length;

            const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Painel do WABot3</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-950 text-gray-100 font-sans min-h-screen flex flex-col justify-between">
                
                <header class="bg-gray-900 border-b border-gray-800 p-4 shadow-md">
                    <div class="max-w-5xl mx-auto flex justify-between items-center">
                        <h1 class="text-xl font-bold text-green-400 flex items-center gap-2">
                            🤖 WABot3 <span class="text-xs bg-green-950 text-green-400 px-2 py-0.5 rounded-full border border-green-800 font-mono animate-pulse">ONLINE</span>
                        </h1>
                        <div class="flex items-center gap-4">
                            <span class="text-xs text-gray-400 font-mono bg-gray-800 px-3 py-1 rounded-md border border-gray-700">Dono: ${numeroDono}</span>
                            <form action="/reiniciar" method="POST" onsubmit="return confirm('Deseja reiniciar o bot remoto?');">
                                <button type="submit" class="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg transition shadow-md">
                                    🔄 Reiniciar Bot
                                </button>
                            </form>
                        </div>
                    </div>
                </header>

                <main class="max-w-5xl w-full mx-auto p-4 flex-grow my-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div class="md:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-xl flex flex-col justify-between">
                        <div>
                            <h2 class="text-base font-semibold text-gray-200 mb-3 flex items-center justify-between">
                                🛠️ Comandos Ativos
                                <span class="text-xs bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded-md font-mono">${totalComandos} Total</span>
                            </h2>
                            
                            <div class="mb-4">
                                <h3 class="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">👑 Admin</h3>
                                <ul class="text-xs font-mono text-gray-400 space-y-1 bg-gray-950 p-2 rounded-lg border border-gray-800">
                                    ${comandos.admin.map(c => `<li class="flex items-center gap-1"><span class="text-red-500">•</span> ${c}</li>`).join('') || '<li>Nenhum</li>'}
                                </ul>
                            </div>

                            <div class="mb-4">
                                <h3 class="text-xs font-bold uppercase tracking-wider text-green-400 mb-1">🌍 General</h3>
                                <ul class="text-xs font-mono text-gray-400 space-y-1 bg-gray-950 p-2 rounded-lg border border-gray-800 max-h-32 overflow-y-auto">
                                    ${comandos.general.map(c => `<li class="flex items-center gap-1"><span class="text-green-500">•</span> ${c}</li>`).join('') || '<li>Nenhum</li>'}
                                </ul>
                            </div>

                            <div>
                                <h3 class="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">⚙️ Utils</h3>
                                <ul class="text-xs font-mono text-gray-400 space-y-1 bg-gray-950 p-2 rounded-lg border border-gray-800">
                                    ${comandos.utils.map(c => `<li class="flex items-center gap-1"><span class="text-purple-500">•</span> ${c}</li>`).join('') || '<li>Nenhum</li>'}
                                </ul>
                            </div>
                        </div>

                        <div class="mt-4 pt-3 border-t border-gray-800 text-center text-xs text-gray-500">
                            Adicione novos arquivos no projeto para atualizar a lista.
                        </div>
                    </div>

                    <div class="md:col-span-2 bg-gray-900 rounded-xl border border-gray-800 shadow-xl p-5 flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-center mb-4">
                                <h2 class="text-base font-semibold text-gray-200 flex items-center gap-2">
                                    💾 Conteúdo Salvo ('dados_salvos.txt')
                                </h2>
                                <form action="/limpar" method="POST" onsubmit="return confirm('Tem certeza que deseja apagar o arquivo salvo?');">
                                    <button type="submit" class="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1.5 rounded-lg transition shadow-md">
                                        🗑️ Limpar Arquivo
                                    </button>
                                </form>
                            </div>
                            
                            <div class="bg-gray-950 rounded-lg p-4 border border-gray-800 font-mono text-sm overflow-x-auto whitespace-pre-wrap max-h-[400px] h-[350px] shadow-inner text-green-400">
                                ${textoSalvo.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
                            </div>
                        </div>
                    </div>
                </main>

                <footer class="bg-gray-900 border-t border-gray-800 text-center py-3 text-xs text-gray-500 font-mono">
                    Monitorado via UptimeRobot • Hospedado na Render
                </footer>
            </body>
            </html>
            `;

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(html);
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }).listen(PORT, () => {
        console.log(`🌍 Painel administrativo rodando na porta ${PORT}`);
    });
}