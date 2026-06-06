import fs from 'fs';

export default async function(sock, msg, comando, remetente) {
    // 1. Se o arquivo não existir, reage com erro e para
    if (!fs.existsSync('crono.json')) {
        await sock.sendMessage(remetente, {
            react: { text: '❌', key: msg.key }
        });
        await sock.sendMessage(remetente, {
            text: '❌ Arquivo `crono.json` não encontrado.'
        });
        return;
    }

    try {
        // Reage imediatamente para dar feedback visual de que o comando foi aceito
        await sock.sendMessage(remetente, {
            react: { text: '✅', key: msg.key }
        });

        // 2. Leitura dos arquivos de configuração
        const cronograma = JSON.parse(fs.readFileSync('crono.json', 'utf8'));

        let listaCanceladas = [];
        if (fs.existsSync('aula_cancelada.txt')) {
            const conteudoTxt = fs.readFileSync('aula_cancelada.txt', 'utf8');
            listaCanceladas = conteudoTxt.split('\n').map(m => m.trim().toLowerCase()).filter(m => m !== '');
        }

        let bancoAvisos = {};
        if (fs.existsSync('avisos.json')) {
            bancoAvisos = JSON.parse(fs.readFileSync('avisos.json', 'utf8'));
        }

        // 3. Montagem do esqueleto do cronograma
        const nomesDias = {
            "1": "Segunda-feira",
            "2": "Terça-feira",
            "3": "Quarta-feira",
            "4": "Quinta-feira",
            "5": "Sexta-feira"
        };
        
        let mensagemSemana = `🗓️ *CRONOGRAMA DA SEMANA ÚTIL*\n----------------------------------------`;
        let materiasDaSemanaFormatadas = {};

        // 4. Processa os dias da semana
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
                materiasDaSemanaFormatadas[nomeMinu] = aula.materia;

                if (listaCanceladas.includes(nomeMinu)) {
                    avisoItem = ' ❌ *(CANCELADA)*';
                }
                mensagemSemana += `\n• ${aula.inicio} às ${aula.fim} - ${aula.materia}${avisoItem}`;
            });
        }

        mensagemSemana += `\n\n----------------------------------------`;

        // 5. Adiciona os avisos do mural
        let temAvisos = false;
        let blocoAvisos = `\n📢 *MURAL DE AVISOS:*`;

        for (const [materiaChave, textoAviso] of Object.entries(bancoAvisos)) {
            const nomeExibicao = materiasDaSemanaFormatadas[materiaChave] || (materiaChave.charAt(0).toUpperCase() + materiaChave.slice(1));
            blocoAvisos += `\n📝 *${nomeExibicao}* - ${textoAviso}`;
            temAvisos = true;
        }

        if (temAvisos) {
            mensagemSemana += blocoAvisos;
        } else {
            mensagemSemana += `\n💡 _Dica: Use "💡 matéria: aviso" para fixar um aviso aqui._`;
        }

        // 6. 🔥 O ÚNICO ENVIO DE TEXTO DO ARQUIVO INTEIRO:
        await sock.sendMessage(remetente, {
            text: mensagemSemana
        });

    } catch (erro) {
        console.error("Erro ao gerar cronograma semanal:", erro);
        await sock.sendMessage(remetente, {
            react: { text: '⚠️', key: msg.key }
        });
        await sock.sendMessage(remetente, {
            text: '❌ Erro ao ler a grade semanal.'
        });
    }
}