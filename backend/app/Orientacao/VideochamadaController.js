import jwt from "jsonwebtoken";
import { v4 as uuidv4} from "uuid";
import Model from "./Model.js";
import Usuario from "../Usuario/Model.js";
import { temCancelamentoPendente, MSG_CANCELAMENTO_PENDENTE } from "./FasesController.js";
import { sendEmail } from "../shared/Mailer.js";

const TOKEN_TTL_SEGUNDOS = 3 * 60 * 60;

function assinarTokenJaaS (roomName, { id, name, email, moderator }) {
    const privateKey = (process.env.JAAS_PRIVATE_KEY || '').replace (/\\n/g, '\n');
    const agora = Math.floor (Date.now () / 1000);
    return jwt.sign ({
        aud: 'jitsi',
        iss: 'chat',
        sub: process.env.JAAS_APP_ID,
        room: roomName,
        exp: agora + TOKEN_TTL_SEGUNDOS,
        nbf: agora - 5,
        context: {
            user: { id, name, email, moderator },
            features: {
                livestreaming: false,
                recording: false,
                transcription: false,
                'outbound-call': false,
            },
        },
    }, privateKey, {
        algorithm: 'RS256',
        header: { kid: process.env.JAAS_API_KEY_ID },
    });
}

async function gerarTokenVideochamada (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id });
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        const souAluno = userTipo === 'aluno' && String (orientacao.aluno) === String (userID);
        const souProfessor = userTipo === 'professor' && String (orientacao.professor) === String (userID);
        if (!souAluno && !souProfessor) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        if (orientacao.situacao !== 'confirmado') {
            return res.status (400).json ({ msg: 'A orientação precisa estar confirmada para iniciar uma videochamada.' });
        }
        if (souAluno && !orientacao.cartazGerado && !orientacao.chamadaAoVivo?.ativa) {
            return res.status (400).json ({ msg: 'Aguarde o professor iniciar a videochamada.' });
        }
        const usuario = await Usuario.findOne ({ _id: userID });
        if (!usuario) return res.status (404).json ({ msg: 'Usuário não encontrado.' });
        const roomName = `orientacao-${orientacao._id}`;
        const jaasToken = assinarTokenJaaS (roomName, {
            id: String (usuario._id),
            name: `${usuario.nome} ${usuario.sobrenome || ''}`.trim (),
            email: usuario.email,
            moderator: souProfessor,
        });
        if (souProfessor && !orientacao.chamadaAoVivo?.ativa) {
            orientacao.chamadaAoVivo = { ativa: true, iniciadaEm: new Date () };
            await orientacao.save ();
        }
        res.status (200).json ({ token: jaasToken, roomName, appId: process.env.JAAS_APP_ID });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao gerar token de videochamada.' });
    }
}

async function encerrarVideochamada (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id });
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        const souProfessor = userTipo === 'professor' && String (orientacao.professor) === String (userID);
        if (!souProfessor) {
            return res.status (403).json ({ msg: 'Apenas o professor pode encerrar a videochamada.' });
        }
        orientacao.chamadaAoVivo = { ativa: false, iniciadaEm: orientacao.chamadaAoVivo?.iniciadaEm || null };
        await orientacao.save ();
        res.status (200).json ({ msg: 'Videochamada encerrada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao encerrar videochamada.' });
    }
}

async function gerarTokenVideochamadaPublico (req, res) {
    try {
        const inicioDoDia = new Date ();
        inicioDoDia.setHours (0, 0, 0, 0);
        const orientacao = await Model.findOne ({
            ativo: true,
            _id: req.params.id,
            situacao: 'confirmado',
            presencial: { $ne: true },
            dataDefesa: { $gte: inicioDoDia },
        });
        if (!orientacao) return res.status (404).json ({ msg: 'Defesa não encontrada.' });
        const roomName = `orientacao-${orientacao._id}`;
        const jaasToken = assinarTokenJaaS (roomName, {
            id: `visitante-${Date.now ()}`,
            name: 'Visitante',
            email: '',
            moderator: false,
        });
        res.status (200).json ({ token: jaasToken, roomName, appId: process.env.JAAS_APP_ID });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao gerar token de videochamada.' });
    }
}

async function criarReuniao (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id });
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        if (userTipo !== 'professor' || String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Apenas o orientador pode criar a reunião.' });
        }
        if (orientacao.situacao !== 'confirmado') {
            return res.status (400).json ({ msg: 'A orientação precisa estar confirmada para criar uma reunião.' });
        }
        const usuario = await Usuario.findOne ({ _id: userID });
        if (!usuario) return res.status (404).json ({ msg: 'Usuário não encontrado.' });
        const salaId = uuidv4 ();
        orientacao.reuniao = { salaId, ativa: true, iniciadaEm: new Date () };
        await orientacao.save ();
        const roomName = `reuniao-${orientacao._id}-${salaId}`;
        const jaasToken = assinarTokenJaaS (roomName, {
            id: String (usuario._id),
            name: `${usuario.nome} ${usuario.sobrenome || ''}`.trim (),
            email: usuario.email,
            moderator: true,
        });
        res.status (200).json ({ token: jaasToken, roomName, appId: process.env.JAAS_APP_ID });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao criar reunião.' });
    }
}

async function entrarReuniao (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id });
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        if (userTipo !== 'aluno' || String (orientacao.aluno) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        if (!orientacao.reuniao?.ativa || !orientacao.reuniao?.salaId) {
            return res.status (400).json ({ msg: 'Aguarde o orientador criar a reunião.' });
        }
        const usuario = await Usuario.findOne ({ _id: userID });
        if (!usuario) return res.status (404).json ({ msg: 'Usuário não encontrado.' });
        const roomName = `reuniao-${orientacao._id}-${orientacao.reuniao.salaId}`;
        const jaasToken = assinarTokenJaaS (roomName, {
            id: String (usuario._id),
            name: `${usuario.nome} ${usuario.sobrenome || ''}`.trim (),
            email: usuario.email,
            moderator: false,
        });
        res.status (200).json ({ token: jaasToken, roomName, appId: process.env.JAAS_APP_ID });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao entrar na reunião.' });
    }
}

async function agendarReuniao (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id }).populate ('aluno', 'nome sobrenome email');
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        if (userTipo !== 'professor' || String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Apenas o orientador pode marcar a reunião.' });
        }
        if (orientacao.situacao !== 'confirmado') {
            return res.status (400).json ({ msg: 'A orientação precisa estar confirmada para marcar uma reunião.' });
        }
        if (!req.body.data || !req.body.hora) {
            return res.status (400).json ({ msg: 'Informe data e hora da reunião.' });
        }
        const agendadaPara = new Date (`${req.body.data}T${req.body.hora}:00`);
        if (isNaN (agendadaPara) || agendadaPara <= new Date ()) {
            return res.status (400).json ({ msg: 'A data da reunião precisa ser no futuro.' });
        }
        const salaId = uuidv4 ();
        orientacao.reuniao = { salaId, ativa: false, iniciadaEm: null, agendadaPara };
        await orientacao.save ();
        if (orientacao.aluno?.email) {
            sendEmail (
                orientacao.aluno.email,
                'SOTCC - Reunião marcada',
                `<h3>Seu orientador marcou uma reunião para ${formatarDataHora (agendadaPara)}.</h3><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a>`,
            );
        }
        res.status (200).json ({ msg: 'Reunião marcada com sucesso.', agendadaPara });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao marcar reunião.' });
    }
}

function formatarDataHora (data) {
    const dia = String (data.getUTCDate ()).padStart (2, '0');
    const mes = String (data.getUTCMonth () + 1).padStart (2, '0');
    const ano = data.getUTCFullYear ();
    const hora = String (data.getUTCHours ()).padStart (2, '0');
    const min = String (data.getUTCMinutes ()).padStart (2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

async function encerrarReuniao (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id });
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (userTipo !== 'professor' || String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Apenas o professor pode encerrar a reunião.' });
        }
        orientacao.reuniao = { salaId: orientacao.reuniao?.salaId || null, ativa: false, iniciadaEm: orientacao.reuniao?.iniciadaEm || null };
        await orientacao.save ();
        res.status (200).json ({ msg: 'Reunião encerrada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao encerrar reunião.' });
    }
}

export { gerarTokenVideochamada, encerrarVideochamada, gerarTokenVideochamadaPublico, criarReuniao, entrarReuniao, agendarReuniao, encerrarReuniao };
