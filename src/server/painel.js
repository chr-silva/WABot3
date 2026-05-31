import { createServer } from 'http';
import { URL } from 'url';
import fs from 'fs';

export function iniciarPainel(numeroDono) {
    const PORT = process.env.PORT || 3000;

    createServer((req, res) => {
        const minhaUrl = new URL(req.url, `http://${req.headers.host}`);
        
        // 🗑️ Ação: Limpar o arquivo de texto via painel
        if (minhaUrl.pathname === '/limpar' && req.method === 'POST') {
            try {
                if (fs.existsSync('dados_salvos.txt')) {
                    fs.unlinkSync('dados_salvos.txt');
                }
                res.writeHead(302, { 'Location': '/' });
                return res.end();
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('Erro ao limpar o arquivo.');
            }
        }

        // 📄 Página Principal do Painel
        if (minhaUrl.pathname === '/') {
            let textoSalvo = "📂 Nenhum dado salvo ainda.";
            if (fs.existsSync('dados_salvos.txt')) {
                textoSalvo = fs.readFileSync('dados_salvos.txt', 'utf8');
            }

            const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Painel do WABot3</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-900 text-gray-100 font-sans min-h-screen flex flex-col justify-between">
                <header class="bg-gray-800 border-b border-gray-700 p-4 shadow-md">
                    <div class="max-w-4xl mx-auto flex justify-between items-center">
                        <h1 class="text-xl font-bold text-green-400 flex items-center gap-2">
                            🤖 WABot3 <span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full border border-green-700 font-mono">ONLINE</span>
                        </h1>
                        <span class="text-xs text-gray-400 font-mono">Dono: ${numeroDono}</span>
                    </div>
                </header>

                <main class="max-w-4xl w-full mx-auto p-4 flex-grow my-6">
                    <div class="bg-gray-800 rounded-xl border border-gray-700 shadow-xl p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
                                💾 Conteúdo Salvo Atual
                            </h2>
                            <form action="/limpar" method="POST" onsubmit="return confirm('Tem certeza que deseja apagar o arquivo salvo?');">
                                <button type="submit" class="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1.5 rounded-lg transition shadow-md">
                                    🗑️ Limpar Arquivo
                                </button>
                            </form>
                        </div>
                        
                        <div class="bg-gray-950 rounded-lg p-4 border border-gray-800 font-mono text-sm overflow-x-auto whitespace-pre-wrap max-h-96 shadow-inner text-green-300">
                            ${textoSalvo.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
                        </div>
                    </div>
                </main>

                <footer class="bg-gray-800 border-t border-gray-700 text-center py-3 text-xs text-gray-500 font-mono">
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