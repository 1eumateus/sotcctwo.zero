import cron from "node-cron";
import Model from "./Model.js";
import { notificar } from './Notificar.js';

const DIAS_ANTECEDENCIA = 3;

function formatarData (value) {
    if (!value) return '';
    const data = new Date (value);
    const ano = data.getUTCFullYear ();
    const mes = String (data.getUTCMonth () + 1).padStart (2, '0');
    const dia = String (data.getUTCDate ()).padStart (2, '0');
    return `${dia}/${mes}/${ano}`;
}

async function verificarPrazos () {
    const agora = new Date ();
    const limite = new Date (agora.getTime () + DIAS_ANTECEDENCIA * 24 * 60 * 60 * 1000);
    const orientacoes = await Model.find ({ ativo: true });
    for (const orientacao of orientacoes) {
        // Prazos suspensos enquanto há pedido de cancelamento em aberto.
        if (orientacao.cancelamento?.solicitadoPor && !orientacao.cancelamento?.resposta?.data) continue;
        let mudou = false;
        for (const fase of orientacao.fases) {
            if (fase.situacao === 'aprovada') continue;
            if (!fase.prazo || fase.lembretePrazoEnviado) continue;
            if (fase.prazo < agora || fase.prazo > limite) continue;
            notificar (orientacao._id, 'SOTCC - Prazo se aproximando', (aluno, professor) => ({
                aluno: `<h3>O prazo da fase "${fase.nome}" da sua orientação com o professor ${professor} termina em ${formatarData (fase.prazo)}.</h3>`,
                professor: `<h3>O prazo da fase "${fase.nome}" do aluno ${aluno} termina em ${formatarData (fase.prazo)}.</h3>`,
            }));
            fase.lembretePrazoEnviado = true;
            mudou = true;
        }
        if (mudou) await orientacao.save ();
    }
}

function start () {
    cron.schedule ('0 8 * * *', () => {
        verificarPrazos ().catch ((error) => console.log ('Erro ao verificar prazos:', error));
    });
}

export { start };
