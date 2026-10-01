import cron from "node-cron";
import Model from "./Model.js";
import { notificar } from './Notificar.js';
import { registrar, eventoReuniao } from './Registro.js';

function formatarDataHora (data) {
    const dia = String (data.getUTCDate ()).padStart (2, '0');
    const mes = String (data.getUTCMonth () + 1).padStart (2, '0');
    const ano = data.getUTCFullYear ();
    const hora = String (data.getUTCHours ()).padStart (2, '0');
    const min = String (data.getUTCMinutes ()).padStart (2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

async function abrirReunioesAgendadas () {
    const agora = new Date ();
    const orientacoes = await Model.find ({
        ativo: true,
        'reuniao.ativa': false,
        'reuniao.agendadaPara': { $ne: null, $lte: agora },
    });
    for (const orientacao of orientacoes) {
        const agendadaPara = orientacao.reuniao.agendadaPara;
        orientacao.reuniao.ativa = true;
        registrar (orientacao, eventoReuniao (orientacao));
        orientacao.reuniao.iniciadaEm = new Date ();
        await orientacao.save ();
        notificar (orientacao._id, 'SOTCC - Reunião liberada', (aluno, professor) => ({
            aluno: `<h3>A reunião com o professor ${professor} marcada para ${formatarDataHora (agendadaPara)} já está liberada. Entre na página de acompanhamento.</h3>`,
            professor: `<h3>A reunião com o aluno ${aluno} marcada para ${formatarDataHora (agendadaPara)} já está liberada. Entre na página de acompanhamento.</h3>`,
        }));
    }
}

function start () {
    cron.schedule ('* * * * *', () => {
        abrirReunioesAgendadas ().catch ((error) => console.log ('Erro ao abrir reuniões agendadas:', error));
    });
}

export { start };
