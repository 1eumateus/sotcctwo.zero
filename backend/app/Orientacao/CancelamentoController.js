import Model from "./Model.js";
import jwt from "jsonwebtoken";
import { notificar } from './Notificar.js';
import { registrar, eventosCancelamento } from './Registro.js';

function cancelamentoPendente (orientacao) {
    return !!orientacao.cancelamento?.solicitadoPor && !orientacao.cancelamento?.resposta?.data;
}

const DIA = 24 * 60 * 60 * 1000;

// Prazos ficam suspensos enquanto o pedido de cancelamento está aberto.
// Quando a orientação continua (pedido recusado ou retirado), os prazos em aberto
// são adiados pelos dias que ficaram suspensos.
function retomarPrazos (orientacao, agora = new Date ()) {
    const inicio = orientacao.cancelamento?.data;
    if (!inicio) return 0;
    const dias = Math.ceil ((agora - new Date (inicio)) / DIA);
    if (dias <= 0) return 0;
    // Prazo guarda só o dia; ele ainda estava aberto se o dia não tinha terminado quando o pedido foi feito.
    const aberto = (prazo) => prazo && new Date (prazo).getTime () + DIA > new Date (inicio).getTime ();
    const adiar = (prazo) => new Date (new Date (prazo).getTime () + dias * DIA);
    let adiados = 0;
    for (const fase of orientacao.fases || []) {
        if (fase.situacao === 'aprovada') continue;
        if (aberto (fase.prazo)) {
            fase.prazo = adiar (fase.prazo);
            fase.lembretePrazoEnviado = false;
            adiados++;
        }
        for (const atividade of fase.atividades || []) {
            if (!atividade.concluida && aberto (atividade.prazo)) {
                atividade.prazo = adiar (atividade.prazo);
                adiados++;
            }
        }
    }
    if (adiados) {
        registrar (orientacao, [{ data: agora, texto: `Prazos adiados em ${dias} ${dias > 1 ? 'dias' : 'dia'}: ficaram suspensos durante o pedido de cancelamento` }]);
    }
    return dias;
}

async function solicitarCancelamento (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        if (userTipo !== 'aluno') {
            return res.status (403).json ({ msg: 'Apenas o aluno solicita cancelamento. O professor pode cancelar diretamente.' });
        }
        if (!req.body.motivo?.trim ()) {
            return res.status (400).json ({ msg: 'Justifique o motivo do cancelamento.' });
        }
        const orientacao = await Model.findOne ({ ativo: true, situacao: 'confirmado', _id: req.params.id }).populate ('professor', 'email');
        if (!orientacao) {
            return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        }
        if (String (orientacao.aluno) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        if (cancelamentoPendente (orientacao)) {
            return res.status (400).json ({ msg: 'Já existe uma solicitação de cancelamento pendente.' });
        }
        const faseAtualIndex = orientacao.fases.findIndex ((f) => f.situacao !== 'aprovada');
        const faseAtual = faseAtualIndex === -1 ? orientacao.fases.length : faseAtualIndex;
        if (faseAtual > 1) {
            return res.status (400).json ({ msg: 'Cancelamento disponível apenas até a fase de Desenvolvimento.' });
        }
        const motivo = req.body.motivo.trim ();
        registrar (orientacao, eventosCancelamento (orientacao.cancelamento));
        orientacao.cancelamento = {
            solicitadoPor: 'aluno',
            motivo,
            data: new Date (),
        };
        await orientacao.save ();
        notificar (orientacao._id, 'SOTCC - Solicitação de cancelamento', (aluno, professor) => ({
            aluno: `<h3>Você solicitou o cancelamento da orientação com o professor ${professor}.</h3><p>Motivo: ${motivo}</p>`,
            professor: `<h3>O aluno ${aluno} solicitou o cancelamento da orientação.</h3><p>Motivo: ${motivo}</p>`,
        }));
        res.status (200).json ({ msg: 'Solicitação de cancelamento enviada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao solicitar cancelamento.' });
    }
}

async function cancelarOrientacao (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        if (userTipo !== 'professor') {
            return res.status (403).json ({ msg: 'Apenas o professor cancela a orientação diretamente.' });
        }
        if (!req.body.motivo?.trim ()) {
            return res.status (400).json ({ msg: 'Justifique o motivo do cancelamento.' });
        }
        const orientacao = await Model.findOne ({ ativo: true, situacao: 'confirmado', _id: req.params.id }).populate ('aluno', 'email');
        if (!orientacao) {
            return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        }
        if (String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        const motivo = req.body.motivo.trim ();
        registrar (orientacao, eventosCancelamento (orientacao.cancelamento));
        orientacao.cancelamento = {
            solicitadoPor: 'professor',
            motivo,
            data: new Date (),
            resposta: { aceito: true, data: new Date () },
        };
        orientacao.ativo = false;
        orientacao.encerradoEm = new Date ();
        orientacao.situacao = 'cancelado';
        await orientacao.save ();
        notificar (orientacao._id, 'SOTCC - Orientação cancelada', (aluno, professor) => ({
            aluno: `<h3>O professor ${professor} cancelou sua orientação.</h3><p>Motivo: ${motivo}</p>`,
            professor: `<h3>Você cancelou a orientação do aluno ${aluno}.</h3><p>Motivo: ${motivo}</p>`,
        }));
        res.status (200).json ({ msg: 'Orientação cancelada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao cancelar orientação.' });
    }
}

async function responderCancelamento (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id }).populate ('aluno professor', 'nome email');
        if (!orientacao) {
            return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        }
        if (!cancelamentoPendente (orientacao)) {
            return res.status (400).json ({ msg: 'Não há cancelamento pendente para esta orientação.' });
        }
        const solicitadoPor = orientacao.cancelamento.solicitadoPor;
        const dono = userTipo === 'aluno' ? orientacao.aluno._id : orientacao.professor._id;
        if (userTipo === 'admin' || userTipo === solicitadoPor || String (dono) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não pode responder a este cancelamento.' });
        }
        if (req.body.aceitar) {
            orientacao.cancelamento.resposta = { aceito: true, data: new Date () };
            orientacao.ativo = false;
            orientacao.encerradoEm = new Date ();
            orientacao.situacao = 'cancelado';
            await orientacao.save ();
            notificar (orientacao._id, 'SOTCC - Cancelamento aceito', (aluno, professor) => ({
                aluno: solicitadoPor === 'aluno'
                    ? `<h3>O professor ${professor} aceitou sua solicitação de cancelamento. A orientação foi encerrada.</h3>`
                    : `<h3>Você aceitou o cancelamento solicitado pelo professor ${professor}. A orientação foi encerrada.</h3>`,
                professor: solicitadoPor === 'aluno'
                    ? `<h3>Você aceitou o cancelamento solicitado pelo aluno ${aluno}. A orientação foi encerrada.</h3>`
                    : `<h3>O aluno ${aluno} aceitou sua solicitação de cancelamento. A orientação foi encerrada.</h3>`,
            }));
            return res.status (200).json ({ msg: 'Cancelamento aceito. A orientação foi encerrada.' });
        }
        if (!req.body.motivo?.trim ()) {
            return res.status (400).json ({ msg: 'Justifique o motivo da recusa.' });
        }
        retomarPrazos (orientacao);
        orientacao.cancelamento.resposta = { aceito: false, motivo: req.body.motivo.trim (), data: new Date () };
        await orientacao.save ();
        const motivoRecusa = `<p>Motivo: ${req.body.motivo.trim ()}</p>`;
        notificar (orientacao._id, 'SOTCC - Cancelamento recusado', (aluno, professor) => ({
            aluno: solicitadoPor === 'aluno'
                ? `<h3>O professor ${professor} recusou sua solicitação de cancelamento.</h3>${motivoRecusa}`
                : `<h3>Você recusou o cancelamento solicitado pelo professor ${professor}.</h3>${motivoRecusa}`,
            professor: solicitadoPor === 'aluno'
                ? `<h3>Você recusou o cancelamento solicitado pelo aluno ${aluno}.</h3>${motivoRecusa}`
                : `<h3>O aluno ${aluno} recusou sua solicitação de cancelamento.</h3>${motivoRecusa}`,
        }));
        res.status (200).json ({ msg: 'Solicitação de cancelamento recusada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao responder ao cancelamento.' });
    }
}

async function retirarCancelamento (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id });
        if (!orientacao) {
            return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        }
        if (!cancelamentoPendente (orientacao)) {
            return res.status (400).json ({ msg: 'Não há cancelamento pendente para esta orientação.' });
        }
        if (userTipo !== orientacao.cancelamento.solicitadoPor) {
            return res.status (403).json ({ msg: 'Apenas quem solicitou pode retirar o pedido de cancelamento.' });
        }
        const retiradoPor = orientacao.cancelamento.solicitadoPor;
        retomarPrazos (orientacao);
        registrar (orientacao, eventosCancelamento (orientacao.cancelamento), [{ data: new Date (), texto: `{${retiradoPor}} retirou a solicitação de cancelamento` }]);
        orientacao.cancelamento = null;
        await orientacao.save ();
        notificar (orientacao._id, 'SOTCC - Solicitação de cancelamento retirada', (aluno, professor) => ({
            aluno: retiradoPor === 'aluno'
                ? `<h3>Você retirou a solicitação de cancelamento. A orientação com o professor ${professor} continua.</h3>`
                : `<h3>O professor ${professor} retirou a solicitação de cancelamento. A orientação continua.</h3>`,
            professor: retiradoPor === 'aluno'
                ? `<h3>O aluno ${aluno} retirou a solicitação de cancelamento. A orientação continua.</h3>`
                : `<h3>Você retirou a solicitação de cancelamento. A orientação com o aluno ${aluno} continua.</h3>`,
        }));
        res.status (200).json ({ msg: 'Solicitação de cancelamento retirada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao retirar solicitação de cancelamento.' });
    }
}

export { retomarPrazos, solicitarCancelamento, cancelarOrientacao, responderCancelamento, retirarCancelamento };
