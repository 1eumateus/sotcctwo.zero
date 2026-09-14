import Model from "./Model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import { sendEmail } from '../shared/Mailer.js';

// clicar no sino marca toda a ATIVIDADE (arquivo/comentário/prazo/etc) como
// vista de uma vez - solicitação e cancelamento pendentes continuam contando
// (não são "lidas", precisam de ação de verdade, não só abrir o sino).
async function marcarNotificacoesVistas (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo } = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const campo = userTipo === 'aluno' ? 'ultimaVisualizacaoAluno' : 'ultimaVisualizacaoProfessor';
        const filtro = { ativo: true };
        filtro [userTipo] = new ObjectId (String (userID));
        await Model.updateMany (filtro, { $set: { [campo]: new Date () } });
        res.status (200).json ({});
    } catch (error) {
        console.log (error);
        return res.status (400).json ({});
    }
}

async function listar (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo } = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const filtro = {ativo: true}
        if (userTipo === 'aluno') {
            filtro.aluno = new ObjectId (String (userID));
        }
        if (userTipo === 'professor'){
            filtro.professor = new ObjectId (String (userID));
        }
        const item = await Model.aggregate ([
            { $match: filtro },
            {
                $project: {
                    _id: 1,
                    professor: 1,
                    aluno: 1,
                    ativo: 1,
                    situacao: 1,
                    confirmadoEm: 1,
                    proposta: 1,
                    resposta:1,
                    coorientador: 1,
                    tema: 1,
                    dataDefesa: 1,
                    horaDefesa: 1,
                    dataCriacao: 1,
                    fases: 1,
                    ultimaVisualizacaoAluno: 1,
                    ultimaVisualizacaoProfessor: 1,
                    cancelamento: 1,
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'professor',
                    foreignField: '_id',
                    as: 'professor',
                    pipeline: [
                        { $project: { nome: 1, sobrenome: 1, email:1, interesse: 1, imagem: 1, _id: 1 } }
                    ]
                },
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'aluno',
                    foreignField: '_id',
                    as: 'aluno',
                    pipeline: [
                        { $project: { nome: 1, sobrenome: 1, email: 1, imagem: 1, _id: 1 } }
                    ]
                },
            },
            {
                $unwind: {
                    path: '$aluno',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$professor',
                    preserveNullAndEmptyArrays: true
                }
            },
        ]);
        item.forEach ((o) => {
            const atividade = atividadeMaisRecente (o, userTipo);
            o.notificacaoDetalhe = atividade?.detalhe || null;
            o.notificacaoLida = atividade ? atividade.lida : true;
            o.notificacao = atividade ? !atividade.lida : false;
            const faseEmAndamentoIndex = (o.fases || []).findIndex ((f) => f.situacao !== 'aprovada');
            const faseEmAndamento = faseEmAndamentoIndex === -1 ? null : o.fases [faseEmAndamentoIndex];
            o.faseAtual = faseEmAndamento ? { nome: faseEmAndamento.nome, prazo: faseEmAndamento.prazo } : null;
            // mesma regra do CancelamentoController: só até a fase de Desenvolvimento (índice <= 1).
            const indiceFase = faseEmAndamentoIndex === -1 ? (o.fases?.length || 0) : faseEmAndamentoIndex;
            o.podeSolicitarCancelamento = indiceFase <= 1;
            // rascunho do tema (definido pelo aluno na Pré-defesa) — mostra na
            // vitrine/tela de orientações mesmo antes do professor gerar o cartaz.
            o.temaRascunho = (o.fases || []).find ((f) => f.nome === 'Pré-defesa')?.descricao || '';
            delete o.fases;
            delete o.ultimaVisualizacaoAluno;
            delete o.ultimaVisualizacaoProfessor;
        });
        res.status (200).json ({ item });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({msg: 'Erro ao buscar solicitações'});
    }
}

async function historico (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo } = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const filtro = {ativo: false}
        if (userTipo === 'aluno') {
            filtro.aluno = new ObjectId (String (userID));
        }
        if (userTipo === 'professor'){
            filtro.professor = new ObjectId (String (userID));
        }
        const item = await Model.aggregate ([
            { $match: filtro },
            {
                $project: {
                    _id: 1,
                    professor: 1,
                    aluno: 1,
                    situacao: 1,
                    tema: 1,
                    proposta: 1,
                    resposta: 1,
                    cancelamento: 1,
                    dataCriacao: 1,
                    dataDefesa: 1,
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'professor',
                    foreignField: '_id',
                    as: 'professor',
                    pipeline: [
                        { $project: { nome: 1, sobrenome: 1, imagem: 1, _id: 1 } }
                    ]
                },
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'aluno',
                    foreignField: '_id',
                    as: 'aluno',
                    pipeline: [
                        { $project: { nome: 1, sobrenome: 1, imagem: 1, _id: 1 } }
                    ]
                },
            },
            {
                $unwind: {
                    path: '$aluno',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$professor',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $sort: { dataCriacao: -1 } },
        ]);
        res.status (200).json ({ item });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({msg: 'Erro ao buscar histórico'});
    }
}

function atividadeMaisRecente (orientacao, userTipo) {
    let maisRecente = null;
    if (userTipo === 'aluno' && orientacao.situacao === 'confirmado' && orientacao.confirmadoEm) {
        maisRecente = { tipo: 'confirmacao', texto: '', fase: '', data: new Date (orientacao.confirmadoEm) };
    }
    for (const fase of orientacao.fases || []) {
        if (userTipo === 'professor') {
            for (const arquivo of fase.arquivos || []) {
                const data = new Date (arquivo.dataEnvio);
                if (!maisRecente || data > maisRecente.data) {
                    maisRecente = { tipo: 'arquivo', texto: arquivo.originalname, fase: fase.nome, data };
                }
            }
            if (fase.descricaoAlteradaEm) {
                const data = new Date (fase.descricaoAlteradaEm);
                if (!maisRecente || data > maisRecente.data) {
                    maisRecente = { tipo: 'descricao', texto: fase.descricao, fase: fase.nome, data };
                }
            }
        }
        if (userTipo === 'aluno' && fase.prazoAlteradoEm) {
            const data = new Date (fase.prazoAlteradoEm);
            if (!maisRecente || data > maisRecente.data) {
                maisRecente = { tipo: 'prazo', texto: fase.prazo, fase: fase.nome, data };
            }
        }
        if (userTipo === 'aluno' && fase.aprovadaEm) {
            const data = new Date (fase.aprovadaEm);
            if (!maisRecente || data > maisRecente.data) {
                maisRecente = { tipo: 'aprovacao', texto: fase.nome, fase: fase.nome, data };
            }
        }
        for (const comentario of fase.comentarios || []) {
            if (comentario.autor === userTipo) continue;
            const data = new Date (comentario.data);
            if (!maisRecente || data > maisRecente.data) {
                maisRecente = { tipo: 'comentario', texto: comentario.texto, fase: fase.nome, data };
            }
        }
    }
    if (orientacao.cancelamento?.solicitadoPor === userTipo && orientacao.cancelamento?.resposta?.data) {
        const data = new Date (orientacao.cancelamento.resposta.data);
        if (!maisRecente || data > maisRecente.data) {
            maisRecente = { tipo: 'cancelamento-resposta', texto: orientacao.cancelamento.resposta, fase: '', data };
        }
    }
    if (!maisRecente) return null;
    const desde = userTipo === 'aluno' ? orientacao.ultimaVisualizacaoAluno : orientacao.ultimaVisualizacaoProfessor;
    const dataDesde = desde ? new Date (desde) : new Date (0);
    return { detalhe: maisRecente, lida: maisRecente.data <= dataDesde };
}

async function criar (req, res) {
    try {
        let orientacao = await Model.findOne (
            { ativo: true, aluno: req.body.aluno, professor: req.body.professor });
        if (orientacao) return res.status (400).json ({ msg: "Pedido de orientação já realizada." });
        const novo = new Model ({
            ativo: true,
            aluno: req.body.aluno,
            professor: req.body.professor,
            proposta: req.body.proposta,
        });
        await novo.save ();
        if (req.body.emailProfessor && req.body.nomeAluno){
            let err = sendEmail (
                req.body.emailProfessor,
                'SOTCC - Solicitação de orientação',
                `<h3>O aluno ${req.body.nomeAluno} deseja ser orientado por você, entre para ver mais detalhes.<h3/><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a>`,
            );
            if (err == true){
                return res.status (400).json ({ msg: "Erro ao enviar email de confirmação." });
            }
        }
        res.json ({ id: novo._id, msg: 'Pedido de orientação enviado.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: "Erro ao solicitar orientação." });
    }
}

async function editar (req, res) {
    try {
        let editar = await Model.findOne ({ ativo:true, _id: req.body._id });
        if (!editar) {
            return res.status (404).json ({ error: "Orientação não encontrada." });
        }
        editar.aluno = req.body.aluno;
        editar.professor = req.body.professor;
        editar.ativo = req.body.ativo;
        editar.situacao = req.body.situacao;
        editar.proposta = req.body.proposta;
        editar.resposta = req.body.resposta;
        editar.banca = req.body.banca;
        editar.coorientador = req.body.coorientador;
        editar.dataDefesa = req.body.dataDefesa;
        editar.horaDefesa = req.body.horaDefesa;
        editar.tema = req.body.tema;
        editar.link = req.body.link;
        editar.presencial = req.body.presencial;
        editar.local = req.body.local;
        // uma via só: nunca desliga de novo, mesmo que "editar" seja chamado
        // sem esse campo (ex.: "Salvar alterações" do cartaz não manda ele).
        if (req.body.cartazGerado) editar.cartazGerado = true;
        await editar.save ();
        res.status (200).json ({ msg: "Orientação editada com sucesso." });
    } catch (error) {
        console.log (error);
        return res.status (400);
    }
}

async function deletar (req, res) {
    try {
        const deletar = await Model.findOne ({ ativo:true, _id: req.params.id });
        if (!deletar) {
            return res.status (404).json ({ error: "Orientação não encontrada." });
        }
        deletar.ativo = false;
        await deletar.save ();
        res.status (200).json ({msg: 'Pedido de orientação deletada.'});
    } catch (error) {
        console.log (error);
        return res.status(400).json ({msg: 'Erro ao deletar orientação.'});
    }
}

async function alterarSituacao (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo:true, _id: req.body.id });
        if (!orientacao) {
            const existiu = await Model.exists ({ _id: req.body.id });
            const msgNaoEncontrada = existiu ? 'O aluno já retirou esta solicitação.' : 'Orientação não encontrada.';
            return res.status (404).json ({ msg: msgNaoEncontrada });
        }
        let msg= ''
        if (userTipo === 'professor') {
            if (req.body.situacao === 'negado' && !req.body.resposta?.trim ()) {
                return res.status (400).json ({ msg: 'Justifique o motivo.' });
            }
            orientacao.situacao = req.body.situacao;
            orientacao.resposta = req.body.resposta;
            if (req.body.situacao === 'confirmado') {
                orientacao.confirmadoEm = new Date ();
            }
            msg = 'Resposta enviada.'
        }
        if (userTipo === 'aluno') {
            if (orientacao.situacao === 'confirmado') {
                return res.status (400).json ({ msg: 'Para uma orientação confirmada, solicite o cancelamento.' });
            }
            orientacao.ativo = false;
            orientacao.situacao = 'cancelado';
            msg = 'Pedido de orientação cancelada.'
        }
        await orientacao.save ();
        if (userTipo === 'professor' && req.body.situacao === 'confirmado') {
            // o aluno pode ter solicitado orientação a vários professores ao mesmo
            // tempo — ao ser aceito por um, as outras solicitações pendentes caem.
            await Model.updateMany (
                { ativo: true, aluno: orientacao.aluno, situacao: 'pendente', _id: { $ne: orientacao._id } },
                { $set: { ativo: false, situacao: 'cancelado', resposta: 'Cancelado automaticamente: você foi aceito por outro professor.' } }
            );
        }
        return res.status (200).json ({msg: msg});
    } catch (error) {
        return res.status (400).json ({msg: 'Erro ao cancelar orientação.'});
    }
}

async function concluirOrientacao (req, res) {
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
        if (orientacao.cancelamento?.solicitadoPor && !orientacao.cancelamento?.resposta?.data) {
            return res.status (400).json ({ msg: 'Ação suspensa: há uma solicitação de cancelamento pendente nesta orientação.' });
        }
        if (userTipo !== 'professor' || String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Apenas o orientador desta orientação pode concluí-la.' });
        }
        const faseAtualIndex = orientacao.fases.findIndex ((f) => f.situacao !== 'aprovada');
        if (faseAtualIndex !== -1) {
            return res.status (400).json ({ msg: 'Todas as fases precisam estar aprovadas para concluir a orientação.' });
        }
        orientacao.situacao = 'concluido';
        orientacao.ativo = false;
        await orientacao.save ();
        res.status (200).json ({ msg: 'Orientação concluída com sucesso.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao concluir orientação.' });
    }
}

async function orientacaoPorProfessor (req, res) {
    try {
        const filtro = { ativo: true, professor: req.params.id, situacao: 'confirmado' };
        const count = await Model.countDocuments (filtro);
        res.json (count);
    } catch (error) {
        return res.status (400).json ({msg: 'Erro ao procurar dados da orientação.'});
    }
}

async function pegarPorId (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const filtro = { _id: new ObjectId (String (req.params.id)) };
        const orientacao = await Model.aggregate ([
            { $match: filtro },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'professor',
                    foreignField: '_id',
                    as: 'professor',
                    pipeline: [
                        { $project: { nome: 1, sobrenome: 1, email:1, interesse: 1, _id: 1 } }
                    ]
                },
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'aluno',
                    foreignField: '_id',
                    as: 'aluno',
                    pipeline: [
                        { $project: { nome: 1, sobrenome: 1, email: 1, imagem: 1, instituicao: 1, _id: 1 } }
                    ]
                },
            },
            {
                $unwind: {
                    path: '$aluno',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$professor',
                    preserveNullAndEmptyArrays: true
                }
            },
        ]);
        if (!orientacao [0]) {
            return res.status (404).json ({ msg: "Orientação não encontrada." });
        }
        if (userTipo !== 'admin' && String (orientacao [0].aluno?._id) !== String (userID) && String (orientacao [0].professor?._id) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        if (!orientacao [0].coorientador) {
            orientacao [0].coorientador = { nome: '', instituicao: '' };
        }

        res.json ({ orientacao: orientacao [0] });
    } catch (error) {
        return res.status (400).json ({msg: 'Erro ao procurar dados da orientação.'});
    }
}

async function listarPublicas (req, res) {
    try {
        const inicioDoDia = new Date ();
        inicioDoDia.setHours (0, 0, 0, 0);
        const filtro = { ativo: true, situacao: 'confirmado', dataDefesa: { $gte: inicioDoDia } };
        const item = await Model.aggregate ([
            { $match: filtro },
            { $sort: { dataDefesa: 1, horaDefesa: 1 } },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'professor',
                    foreignField: '_id',
                    as: 'professor',
                    pipeline: [{ $project: { nome: 1, sobrenome: 1, _id: 0 } }]
                },
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'aluno',
                    foreignField: '_id',
                    as: 'aluno',
                    pipeline: [{ $project: { nome: 1, sobrenome: 1, _id: 0 } }]
                },
            },
            { $unwind: { path: '$aluno', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$professor', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    tema: 1,
                    aluno: 1,
                    professor: 1,
                    banca: 1,
                    coorientador: 1,
                    dataDefesa: 1,
                    horaDefesa: 1,
                    local: 1,
                    presencial: 1,
                    link: 1,
                    chamadaAoVivo: 1,
                }
            },
        ]);
        res.status (200).json ({ item });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao buscar defesas.' });
    }
}

export { listar, criar, deletar, alterarSituacao, editar, pegarPorId, orientacaoPorProfessor, listarPublicas, concluirOrientacao, historico, marcarNotificacoesVistas };
