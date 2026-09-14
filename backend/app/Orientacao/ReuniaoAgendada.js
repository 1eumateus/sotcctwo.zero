import cron from "node-cron";
import Model from "./Model.js";
import { sendEmail } from '../shared/Mailer.js';

function formatarDataHora (data) {
    const dia = String (data.getUTCDate ()).padStart (2, '0');
    const mes = String (data.getUTCMonth () + 1).padStart (2, '0');
    const ano = data.getUTCFullYear ();
    const hora = String (data.getUTCHours ()).padStart (2, '0');
    const min = String (data.getUTCMinutes ()).padStart (2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

// verifica a cada minuto se alguma reunião marcada já chegou na hora - liga
// "ativa" sozinho, sem precisar do professor clicar em nada.
async function abrirReunioesAgendadas () {
    const agora = new Date ();
    const orientacoes = await Model.find ({
        ativo: true,
        'reuniao.ativa': false,
        'reuniao.agendadaPara': { $ne: null, $lte: agora },
    }).populate ('aluno', 'email');
    for (const orientacao of orientacoes) {
        const agendadaPara = orientacao.reuniao.agendadaPara;
        orientacao.reuniao.ativa = true;
        orientacao.reuniao.iniciadaEm = new Date ();
        await orientacao.save ();
        if (orientacao.aluno?.email) {
            sendEmail (
                orientacao.aluno.email,
                'SOTCC - Reunião liberada',
                `<h3>A reunião marcada para ${formatarDataHora (agendadaPara)} já está liberada. Entre na sua página de acompanhamento.</h3><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a>`,
            );
        }
    }
}

function start () {
    cron.schedule ('* * * * *', () => {
        abrirReunioesAgendadas ().catch ((error) => console.log ('Erro ao abrir reuniões agendadas:', error));
    });
}

export { start };
