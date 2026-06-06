// 🛡️ Função auxiliar interna para escapar XSS
function escaparXSS(string) {
    if (!string) return '';
    return string
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 🔑 TELA DE LOGIN
export function gerarHtmlLogin(erro = '') {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - DS Bot</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-950 text-gray-100 font-sans min-h-screen flex items-center justify-center p-4">
        <div class="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm space-y-4">
            <div class="text-center space-y-2">
                <h1 class="text-2xl font-bold text-green-400">DS Bot Panel</h1>
                <p class="text-xs text-gray-400">Insira a senha mestra para acessar os controles do bot.</p>
            </div>
            
            ${erro ? `<div class="bg-red-950/50 border border-red-900 text-red-400 text-xs p-2.5 rounded-lg text-center font-medium">${escaparXSS(erro)}</div>` : ''}

            <form action="/login" method="POST" class="space-y-3">
                <div>
                    <label class="block text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-1">Senha de Acesso</label>
                    <input type="password" name="senha" required placeholder="••••••••" class="w-full text-xs bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-green-500 font-mono">
                </div>
                <button type="submit" class="w-full text-xs bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition shadow-md font-semibold">
                    🔓 Entrar no Painel
                </button>
            </form>
        </div>
    </body>
    </html>
    `;
}

// 📊 TELA PRINCIPAL DO PAINEL
export function gerarHtmlPainel({ numeroDono, totalComandos, comandos, materiasDisponiveis, listaCanceladas, textoSalvo, grupos, paginaAtual }) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Painel do DS Bot</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            function marcarTodos(status) {
                document.querySelectorAll('.materia-checkbox').forEach(cb => cb.checked = status);
            }

            // 🎯 Captura o campo e preenche o texto sem fazer a página atualizar
            function injetarTexto(texto) {
                const campo = document.getElementById('campoMensagem');
                if (campo) {
                    campo.value = texto;
                    campo.focus(); // Coloca o cursor piscando lá dentro de volta
                }
            }
        </script>
    </head>
    <body class="bg-gray-950 text-gray-100 font-sans min-h-screen flex flex-col justify-between">
        
        <header class="bg-gray-900 border-b border-gray-800 p-4 shadow-md">
            <div class="max-w-6xl mx-auto flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" class="h-8 w-8 rounded-lg object-contain" />
                    <h1 class="text-xl font-bold text-green-400 flex items-center gap-2">
                        DS Bot <span class="text-xs bg-green-950 text-green-400 px-2 py-0.5 rounded-full border border-green-800 font-mono animate-pulse">ONLINE</span>
                    </h1>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-xs text-gray-400 font-mono bg-gray-800 px-3 py-1 rounded-md border border-gray-700">Dono: ${escaparXSS(numeroDono)}</span>
                    <form action="/logout" method="POST" class="inline">
                        <button type="submit" class="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-2.5 py-1.5 rounded-lg transition border border-gray-700">🚪 Sair</button>
                    </form>
                    <form action="/reiniciar" method="POST" onsubmit="return confirm('Deseja reiniciar o bot remoto?');">
                        <button type="submit" class="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg transition shadow-md">🔄 Reiniciar Bot</button>
                    </form>
                </div>
            </div>
        </header>

        <main class="max-w-6xl w-full mx-auto p-4 flex-grow my-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-xl space-y-4">
                <h2 class="text-base font-semibold text-gray-200 flex items-center justify-between">
                    🛠️ Comandos Ativos
                    <span class="text-xs bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded-md font-mono">${totalComandos} Total</span>
                </h2>
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">👑 Admin</h3>
                    <ul class="text-xs font-mono text-gray-400 space-y-1 bg-gray-950 p-2 rounded-lg border border-gray-800">
                        ${comandos.admin.map(c => `<li class="flex items-center gap-1"><span class="text-red-500">•</span> ${escaparXSS(c)}</li>`).join('') || '<li>Nenhum</li>'}
                    </ul>
                </div>
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-green-400 mb-1">🌍 General</h3>
                    <ul class="text-xs font-mono text-gray-400 space-y-1 bg-gray-950 p-2 rounded-lg border border-gray-800 max-h-24 overflow-y-auto">
                        ${comandos.general.map(c => `<li class="flex items-center gap-1"><span class="text-green-500">•</span> ${escaparXSS(c)}</li>`).join('') || '<li>Nenhum</li>'}
                    </ul>
                </div>
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">⚙️ Utils</h3>
                    <ul class="text-xs font-mono text-gray-400 space-y-1 bg-gray-950 p-2 rounded-lg border border-gray-800">
                        ${comandos.utils.map(c => `<li class="flex items-center gap-1"><span class="text-purple-500">•</span> ${escaparXSS(c)}</li>`).join('') || '<li>Nenhum</li>'}
                    </ul>
                </div>
            </div>

            <div class="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-xl space-y-6">
                <div>
                    <h2 class="text-base font-semibold text-gray-200 mb-3">📢 Gerenciar Mural de Avisos</h2>
                    <form action="/postar-aviso" method="POST" class="space-y-2">
                        <select name="materia" required class="w-full text-xs bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 focus:outline-none focus:border-green-500 cursor-pointer">
                            <option value="" disabled selected>Selecione a matéria...</option>
                            ${materiasDisponiveis.map(mat => `<option value="${escaparXSS(mat)}">${escaparXSS(mat)}</option>`).join('')}
                        </select>
                        <input type="text" name="aviso" placeholder="Escreva o aviso ou lembrete aqui..." required class="w-full text-xs bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 focus:outline-none focus:border-green-500">
                        <button type="submit" class="w-full text-xs bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition shadow-md">📌 Fixar Aviso no Mural</button>
                    </form>
                    <form action="/limpar-avisos" method="POST" class="mt-2" onsubmit="return confirm('Apagar todos os avisos?');">
                        <button type="submit" class="w-full text-xs bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-white py-1 rounded-lg transition border border-gray-700 hover:border-red-800">🗑️ Limpar Mural Inteiro</button>
                    </form>
                </div>

                <div class="border-t border-gray-800 pt-4">
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="text-base font-semibold text-gray-200">🚫 Aulas Canceladas</h2>
                        <div class="flex gap-1.5">
                            <button type="button" onclick="marcarTodos(true)" class="text-[10px] bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-2 py-0.5 rounded transition">Marcar Todas</button>
                            <form action="/restaurar-aulas" method="POST" onsubmit="return confirm('Restaurar todas as aulas do cronograma?');">
                                <button type="submit" class="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-medium px-2 py-0.5 rounded transition">Restaurar Todas</button>
                            </form>
                        </div>
                    </div>
                    <form action="/atualizar-cancelamentos" method="POST" class="space-y-3">
                        <div class="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2 max-h-40 overflow-y-auto">
                            ${materiasDisponiveis.map(mat => {
                                const estaCancelada = listaCanceladas.includes(mat);
                                return `
                                <label class="flex items-center gap-3 cursor-pointer select-none text-xs text-gray-300 hover:text-white font-mono bg-gray-900/50 p-1.5 rounded border border-transparent hover:border-gray-800">
                                    <input type="checkbox" name="${escaparXSS(mat)}" class="materia-checkbox w-3.5 h-3.5 rounded border-gray-700 text-red-600 bg-gray-950 focus:ring-0" ${estaCancelada ? 'checked' : ''}>
                                    <span class="${estaCancelada ? 'text-red-400 font-bold line-through' : ''}">${estaCancelada ? '❌' : '📖'} ${escaparXSS(mat)}</span>
                                </label>`;
                            }).join('') || '<span class="text-gray-500 italic text-xs">Nenhuma matéria no cronograma.</span>'}
                        </div>
                        <button type="submit" class="w-full text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition shadow-md">💾 Salvar Alterações</button>
                    </form>
                </div>
            </div>

                <div class="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                        <h2 class="text-base font-semibold text-gray-200 mb-2">💬 Disparar Mensagem Instantânea</h2>
                        <form action="/enviar-mensagem" method="POST" class="space-y-2">
                            <select name="grupoId" required class="w-full text-xs bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer font-mono">
                                <option value="" disabled selected>Selecione um grupo ativo...</option>
                                ${grupos.map(g => `<option value="${escaparXSS(g.id)}">👥 ${escaparXSS(g.nome)}</option>`).join('')}
                            </select>
                            
                            <textarea id="campoMensagem" name="mensagem" placeholder="Sua mensagem para o grupo..." required class="w-full text-xs bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 focus:outline-none focus:border-blue-500 h-20 resize-none"></textarea>
                            
                            <div class="space-y-1.5">
                                <label class="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Textos Rápidos:</label>
                                <div class="grid sm:grid-cols-2 gap-2">
                                    <button type="button" onclick="injetarTexto('📅 *CRONOGRAMA ATUALIZADO:*\\n\\n📖 Matéria 1\\n📖 Matéria 2')" class="text-left text-[11px] bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-300 p-2 rounded-lg transition font-medium flex items-center gap-1.5 shadow-sm">
                                        📅 Enviar Cronograma
                                    </button>
                                    <button type="button" onclick="injetarTexto('⚠️ *ATENÇÃO GRUPO:*\\n\\nAs aulas de hoje sofreram alterações. Verifiquem o mural.')" class="text-left text-[11px] bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-300 p-2 rounded-lg transition font-medium flex items-center gap-1.5 shadow-sm">
                                        ⚠️ Alerta de Aula
                                    </button>
                                    <button type="button" data-texto-salvo id="btnNotaSalva" onclick="injetarTexto(this.dataset.textoSalvo)" class="text-left text-[11px] bg-indigo-950 hover:bg-indigo-900 border border-indigo-900 text-indigo-300 p-2 rounded-lg transition font-medium flex items-center gap-1.5 shadow-sm truncate">
                                        📂 Copiar Nota Salva
                                    </button>
                                </div>
                            </div>
                            
                            <div class="flex justify-between items-center gap-2 pt-2">
                                <div class="flex gap-1">
                                    <a href="/?pg=${paginaAtual > 1 ? paginaAtual - 1 : 1}" class="text-[10px] bg-gray-800 border border-gray-700 px-2 py-1 rounded hover:bg-gray-700 ${paginaAtual === 1 ? 'opacity-40 pointer-events-none' : ''}">◀ Voltar</a>
                                    <span class="text-[10px] font-mono self-center px-1 text-gray-400">Pg ${paginaAtual}</span>
                                    <a href="/?pg=${paginaAtual + 1}" class="text-[10px] bg-gray-800 border border-gray-700 px-2 py-1 rounded hover:bg-gray-700">Mais ▶</a>
                                </div>
                                <button type="submit" class="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-1.5 rounded-lg transition shadow-md font-semibold">🚀 Enviar</button>
                            </div>
                        </form>
                    </div>

                    <div class="border-t border-gray-800 pt-3 flex-grow flex flex-col justify-between">
                        <div class="flex justify-between items-center mb-2">
                            <h2 class="text-xs font-bold uppercase tracking-wider text-gray-400">📂 Notas em dados_salvos.txt</h2>
                            <form action="/limpar" method="POST" onsubmit="return confirm('Apagar o arquivo de notas?');">
                                <button type="submit" class="text-[10px] bg-red-950 border border-red-900 text-red-400 px-2 py-0.5 rounded hover:bg-red-900/40">Limpar</button>
                            </form>
                        </div>
                        <div class="bg-gray-950 rounded-lg p-2 border border-gray-800 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap text-green-400 h-32 shadow-inner">
                            ${escaparXSS(textoSalvo)}
                        </div>
                    </div>
                </div>
        </main>

        <footer class="bg-gray-900 border-t border-gray-800 text-center py-2 text-[10px] text-gray-500 font-mono">
            Monitorado via UptimeRobot • Hospedado na Render
        </footer>
    </body>
    </html>
    `;
}