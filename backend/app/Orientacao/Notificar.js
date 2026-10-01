import Model from "./Model.js";
import { sendEmail } from '../shared/Mailer.js';

function nome (usuario) {
    return `${usuario?.nome || ''} ${usuario?.sobrenome || ''}`.trim ();
}

// mensagens (nomeAluno, nomeProfessor) => { aluno: html, professor: html }
async function notificar (orientacaoId, assunto, mensagens) {
    try {
        const orientacao = await Model.findById (orientacaoId).populate ('aluno professor', 'nome sobrenome email');
        if (!orientacao) return;
        const msg = mensagens (nome (orientacao.aluno), nome (orientacao.professor));
        const link = `<p><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a></p>`;
        if (orientacao.aluno?.email) sendEmail (orientacao.aluno.email, assunto, msg.aluno + link);
        if (orientacao.professor?.email) sendEmail (orientacao.professor.email, assunto, msg.professor + link);
    } catch (error) {
        console.log ('Erro ao notificar:', error);
    }
}

export { notificar };
