import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import {
    iniciarPainel
} from './server/painel.js'; // 🌍 Importa o painel modularizado
import {
    startsWith
} from 'firebase/firestore/pipelines';

// Volta o número original com o 9º dígito como estava antes
const NUMERO_DONO = '5591988746023';

// 🧠 Cache na memória para guardar temporariamente o texto das últimas mensagens
const cacheMensagens = new Map();

const EMOJI_SALVAR = '📥';
const EMOJI_LISTAR = '📒';
const REAC_EMOJI_SALVAR = '💾';


async function conectarBot() {
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState('sessao_bot');

    const sock = makeWASocket({
        auth: state,
        logger: pino({
            level: 'silent'
        }),
        printQRInTerminal: false
    });

    // 🔑 --- LÓGICA DO CÓDIGO DE PAREAMENTO ---
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const numeroLimpo = NUMERO_DONO.replace(/[^0-9]/g, '');
                const codigo = await sock.requestPairingCode(numeroLimpo);
                console.log(`\n========================================`);
                console.log(`📱 SEU CÓDIGO DE PAREAMENTO: ${codigo}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error("Erro ao gerar código de pareamento:", err);
            }
        }, 5000); // 5 segundos está ótimo para estabilizar
    }

    // --- 👀 OUVINTE DE REAÇÕES (Invisível e Seguro) ---
    sock.ev.on('messages.reaction', async (reactions) => {
        const reac = reactions[0];
        if (!reac || !reac.reaction) return;

        if (!reac.reaction.key.fromMe) return;

        // const emojiGatilho = '💾';

        if (reac.reaction.text === REAC_EMOJI_SALVAR) {
            const chatRemetente = reac.key.remoteJid;
            const idMensagemReagida = reac.key.id;

            const textoReagido = cacheMensagens.get(idMensagemReagida);

            if (textoReagido) {
                try {
                    fs.writeFileSync('dados_salvos.txt', textoReagido, 'utf8');
                    console.log("✅ Mensagem capturada via reação e salva localmente.");

                    await sock.sendMessage(chatRemetente, {
                        react: {
                            text: '✅',
                            key: reac.key
                        }
                    });
                } catch (erro) {
                    console.error("Erro ao salvar arquivo de reação:", erro);
                }
            } else {
                console.log("⚠️ Mensagem não encontrada no cache local (antiga ou recebida com bot off).");
            }
        }
    });

    // --- 💬 LEITOR DE MENSAGENS E COMANDOS ---
    sock.ev.on('messages.upsert', async ({
        messages,
        type
    }) => {
        if (type !== 'notify') return;

        const msg = messages[0];
        if (!msg.message) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const remetente = msg.key.remoteJid;
        const deMim = msg.key.fromMe;
        const idMensagem = msg.key.id;

        if (texto) {
            cacheMensagens.set(idMensagem, texto);
            if (cacheMensagens.size > 100) {
                const primeiraChave = cacheMensagens.keys().next().value;
                cacheMensagens.delete(primeiraChave);
            }
        }

        if (!deMim) return;

        // if (texto.startsWith('.')) {}
        const comando = texto.trim();

        // 💾 Comando salvar
        if (comando === EMOJI_SALVAR) {
            const mensagemCitadaInfo = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!mensagemCitadaInfo) {
                console.log('❌ Erro: Você precisa usar o comando respondendo a uma mensagem.');
                await sock.sendMessage(remetente, {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                })
                return;
            }

            const textoCitado = mensagemCitadaInfo.conversation || mensagemCitadaInfo.extendedTextMessage?.text;

            if (!textoCitado) {
                await sock.sendMessage(remetente, {
                    text: '❌ Não consegui extrair texto dessa mensagem.'
                });
                return;
            }

            try {
                await sock.sendMessage(remetente, {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                });
                console.log("✅ Mensagem capturada e salva com sucesso.");
                fs.writeFileSync('dados_salvos.txt', textoCitado, 'utf8');
            } catch (erro) {
                console.error("Erro ao salvar arquivo:", erro);
            }
        }

        // 📤 Comando listar (Versão com Edição de Mensagem)
        if (comando === EMOJI_LISTAR) {
            if (!fs.existsSync('dados_salvos.txt')) {
                // Opcional: o bot pode enviar e editar para avisar que está vazio
                const msgErro = await sock.sendMessage(remetente, {
                    text: '📂 Verificando...'
                });
                setTimeout(async () => {
                    await sock.sendMessage(remetente, {
                        text: '❌ Nenhum dado foi salvo ainda!',
                        edit: msgErro.key
                    });

                    await sock.sendMessage(remetente, {
                        react: {
                            text: '❌',
                            key: msg.key
                        }
                    });

                }, 670);

                return;
            }

            try {
                const textoGuardado = fs.readFileSync('dados_salvos.txt', 'utf8');

                // 1. O bot envia uma mensagem inicial de status
                const msgStatus = await sock.sendMessage(remetente, {
                    text: '🔄 Carregando conteúdo salvo...'
                });

                // 2. O bot edita a mensagem anterior injetando o texto guardado
                // Adicionamos um micro delay de 400ms só para o efeito visual ficar legal no WhatsApp
                setTimeout(async () => {
                    await sock.sendMessage(remetente, {
                        text: textoGuardado,
                        edit: msgStatus.key // 🔑 Passa a chave da mensagem que ele vai substituir
                    });
                    await sock.sendMessage(remetente, {
                        react: {
                            text: '✅',
                            key: msg.key
                        }
                    });
                }, 670);

            } catch (erro) {
                console.error("Erro ao ler/editar arquivo:", erro);
            }
        }

        // Comando .ping
        if (comando === 'ping') {
            await sock.sendMessage(remetente, {
                text: 'Tô vivo!.'
            });
        }

        if (comando === 'cmd') {
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

        // ==========================================
        // 🗓️ COMANDO: CRONOGRAMA DA SEMANA COMPLETA (Com Mural de Avisos)
        // ==========================================
        if (comando === '📚') {
            if (!fs.existsSync('crono.json')) {
                await sock.sendMessage(remetente, {
                    text: '❌ Arquivo `crono.json` não encontrado.'
                });
                return;
            }

            try {
                const cronograma = JSON.parse(fs.readFileSync('crono.json', 'utf8'));

                // 1. Corrigido: Carrega a lista de múltiplos cancelamentos do arquivo .txt
                let listaCanceladas = [];
                if (fs.existsSync('aula_cancelada.txt')) {
                    const conteudoTxt = fs.readFileSync('aula_cancelada.txt', 'utf8');
                    // Transforma cada linha do arquivo em um item válido na lista
                    listaCanceladas = conteudoTxt.split('\n').map(m => m.trim().toLowerCase()).filter(m => m !== '');
                }

                // 2. Carrega o banco de avisos
                let bancoAvisos = {};
                if (fs.existsSync('avisos.json')) {
                    bancoAvisos = JSON.parse(fs.readFileSync('avisos.json', 'utf8'));
                }

                const nomesDias = {
                    "1": "Segunda-feira",
                    "2": "Terça-feira",
                    "3": "Quarta-feira",
                    "4": "Quinta-feira",
                    "5": "Sexta-feira"
                };

                let mensagemSemana = `🗓️ *CRONOGRAMA DA SEMANA ÚTIL*\n`;
                mensagemSemana += `----------------------------------------`;

                // Guarda as matérias que aparecem na semana para cruzar com os avisos depois
                let materiasDaSemanaFormatadas = {};

                for (let dia = 1; dia <= 5; dia++) {
                    const aulasDoDia = cronograma[dia];
                    mensagemSemana += `\n\n📌 *${nomesDias[dia]}:*`;

                    if (!aulasDoDia || aulasDoDia.length === 0) {
                        mensagemSemana += `\n ⚪ Sem aulas cadastradas.`;
                        continue;
                    }

                    aulasDoDia.forEach(aula => {
                        let avisoItem = '';
                        const nomeMinu = aula.materia.toLowerCase();

                        // Guarda o nome real da matéria para a lista de avisos ficar bonita (com maiúsculas certas)
                        materiasDaSemanaFormatadas[nomeMinu] = aula.materia;

                        // Corrigido: Verifica se a matéria atual está contida na lista do arquivo txt
                        if (listaCanceladas.includes(nomeMinu)) {
                            avisoItem = ' ❌ *(CANCELADA)*';
                        }
                        mensagemSemana += `\n• ${aula.inicio} às ${aula.fim} - ${aula.materia}${avisoItem}`;
                    });
                }

                mensagemSemana += `\n\n----------------------------------------`;

                // 🌟 NOVO: Bloco de exibição dos Avisos criados
                let temAvisos = false;
                let blocoAvisos = `\n📢 *MURAL DE AVISOS:*`;

                for (const [materiaChave, textoAviso] of Object.entries(bancoAvisos)) {
                    // Pega o nome formatado da matéria ou usa a chave com a primeira letra maiúscula se não achar
                    const nomeExibicao = materiasDaSemanaFormatadas[materiaChave] || (materiaChave.charAt(0).toUpperCase() + materiaChave.slice(1));
                    blocoAvisos += `\n📝 *${nomeExibicao}* - ${textoAviso}`;
                    temAvisos = true;
                }

                // Se houver algum aviso salvo, anexa ele à mensagem principal
                if (temAvisos) {
                    mensagemSemana += blocoAvisos;
                } else {
                    mensagemSemana += `\n💡 _Dica: Use "💡 matéria: aviso" para prender um lembrete aqui._`;
                }

                await sock.sendMessage(remetente, {
                    text: mensagemSemana
                });

            } catch (erro) {
                console.error("Erro ao gerar cronograma semanal:", erro);
                await sock.sendMessage(remetente, {
                    text: '❌ Erro ao ler a grade semanal.'
                });
            }
            return;
        }
        // ==========================================
        // 🚫 COMANDO: CANCELAR MÚLTIPLAS MATÉRIAS (Por Linha)
        // ==========================================
        if (comando.startsWith('🚫 ')) {
            try {
                let canceladas = [];
                // Se o arquivo já existir, lê o texto e separa as matérias por linha
                if (fs.existsSync('aula_cancelada.txt')) {
                    const conteudoTxt = fs.readFileSync('aula_cancelada.txt', 'utf8');
                    canceladas = conteudoTxt.split('\n').map(m => m.trim().toLowerCase()).filter(m => m !== '');
                }

                // Divide o texto recebido por quebras de linha
                const linhas = texto.split('\n');
                let processados = 0;

                linhas.forEach(linha => {
                    const materia = linha.replace('🚫', '').trim().toLowerCase();
                    if (!materia) return;

                    // Se a matéria não estiver na lista, adiciona
                    if (!canceladas.includes(materia)) {
                        canceladas.push(materia);
                    }
                    processados++;
                });

                if (processados > 0) {
                    // Salva a lista de volta no arquivo .txt, juntando tudo com quebras de linha
                    fs.writeFileSync('aula_cancelada.txt', canceladas.join('\n'), 'utf8');
                    await sock.sendMessage(remetente, {
                        react: {
                            text: '🚫',
                            key: msg.key
                        }
                    });
                }
            } catch (err) {
                console.error("Erro ao salvar cancelamentos:", err);
            }
            return;
        }

        // Comando para restaurar TODAS as aulas ao normal
        if (comando === '🚫✅') {
            if (fs.existsSync('aula_cancelada.txt')) {
                fs.unlinkSync('aula_cancelada.txt');
            }
            await sock.sendMessage(remetente, {
                react: {
                    text: '✅',
                    key: msg.key
                }
            });
            return;
        }

        // Comando bônus para voltar tudo ao normal se você errar
        if (comando === '🚫✅') {
            if (fs.existsSync('aula_cancelada.txt')) {
                fs.unlinkSync('aula_cancelada.txt');
            }
            await sock.sendMessage(remetente, {
                react: {
                    text: '✅',
                    key: msg.key
                }
            });
            return;
        }

        // ==========================================
        // 💡 COMANDO: ADICIONAR MÚLTIPLOS AVISOS (Por Linha)
        // ==========================================
        if (comando.startsWith('💡 ')) {
            try {
                let bancoAvisos = {};
                // Se o arquivo de avisos já existir, carrega o que tem nele
                if (fs.existsSync('avisos.json')) {
                    bancoAvisos = JSON.parse(fs.readFileSync('avisos.json', 'utf8'));
                }

                // Divide a mensagem por quebras de linha para processar cada aviso individualmente
                const linhas = texto.split('\n');
                let avisosProcessados = 0;

                linhas.forEach(linha => {
                    // Remove o emoji inicial de cada linha (se a pessoa colocou em todas ou só na primeira)
                    const linhaLimpa = linha.replace('💡', '').trim();

                    // Pula linhas vazias que o usuário possa ter deixado sem querer
                    if (!linhaLimpa) return;

                    // Divide a linha onde encontrar o primeiro ':'
                    const partes = linhaLimpa.split(':');
                    if (partes.length < 2) return; // Se a linha não tiver ':', ignora ela

                    const materiaAlvo = partes[0].trim().toLowerCase();
                    const textoAviso = partes.slice(1).join(':').trim();

                    // Se o aviso for "remover", deleta do banco
                    if (textoAviso.toLowerCase() === 'remover' || textoAviso === '') {
                        delete bancoAvisos[materiaAlvo];
                    } else {
                        // Caso contrário, salva ou atualiza o aviso daquela matéria
                        bancoAvisos[materiaAlvo] = textoAviso;
                    }
                    avisosProcessados++;
                });

                if (avisosProcessados === 0) {
                    await sock.sendMessage(remetente, {
                        text: '❌ Nenhum aviso válido encontrado. Use o formato: `💡 Matéria: Aviso` em cada linha.'
                    });
                    return;
                }

                // Salva todas as alterações de uma vez só no arquivo
                fs.writeFileSync('avisos.json', JSON.stringify(bancoAvisos, null, 2), 'utf8');

                // Reage com a lâmpada confirmando que leu tudo com sucesso
                await sock.sendMessage(remetente, {
                    react: {
                        text: '💡',
                        key: msg.key
                    }
                });

            } catch (err) {
                console.error("Erro ao salvar múltiplos avisos:", err);
                await sock.sendMessage(remetente, {
                    text: '❌ Erro ao processar a lista de avisos.'
                });
            }
            return;
        }

        if (comando === '💡❌') {
            if (fs.existsSync('avisos.json')) {
                fs.unlinkSync('avisos.json'); // Deleta o arquivo de avisos do disco
            }

            sock.sendMessage(remetente, {
                react: {
                    text: '✅',
                    key: msg.key
                }
            })

        }

        //}
    });



    // --- GERENCIADOR DE CONEXÃO ---
    sock.ev.on('connection.update', (update) => {
        const {
            connection,
            lastDisconnect
        } = update;
        if (connection === 'close') {
            const deveReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (deveReconectar) conectarBot();
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }
    });

    sock.ev.on('creds.update', saveCreds);



}

// 🌍 ATENÇÃO: O painel agora liga aqui fora, UMA ÚNICA VEZ, evitando o erro de porta ocupada
iniciarPainel(NUMERO_DONO);

// Liga o bot de forma independente
conectarBot();