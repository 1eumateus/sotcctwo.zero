import Model from "./Model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import { notificar } from './Notificar.js';
import { linhaDoTempo } from './Registro.js';

async function marcarNotificacoesVistas (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo } = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const campo = userTipo === 'aluno' ? 'ultimaVisualizacaoAluno' : 'ultimaVisualizacaoProfessor';
        const filtro = {};
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
        const notificacoes = req.query.notificacoes === '1';
        const filtro = notificacoes ? { $or: [{ ativo: true }, { encerradoEm: { $ne: null } }] } : { ativo: true };
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
                    encerradoEm: 1,
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
                    registro: 1,
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
            o.naoLidas = atividade?.naoLidas || 0;
            const faseEmAndamentoIndex = (o.fases || []).findIndex ((f) => f.situacao !== 'aprovada');
            const faseEmAndamento = faseEmAndamentoIndex === -1 ? null : o.fases [faseEmAndamentoIndex];
            o.faseAtual = faseEmAndamento ? { nome: faseEmAndamento.nome, prazo: faseEmAndamento.prazo } : null;
            const indiceFase = faseEmAndamentoIndex === -1 ? (o.fases?.length || 0) : faseEmAndamentoIndex;
            o.podeSolicitarCancelamento = indiceFase <= 1;
            o.temaRascunho = (o.fases || []).find ((f) => f.nome === 'Pré-defesa')?.descricao || '';
            delete o.fases;
            delete o.ultimaVisualizacaoAluno;
            delete o.ultimaVisualizacaoProfessor;
            delete o.registro;
        });
        // No sino, encerradas só aparecem enquanto o aviso não foi visto.
        res.status (200).json ({ item: notificacoes ? item.filter ((o) => o.ativo || o.notificacao) : item });
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
        // Encerradas + a em andamento, para a linha do tempo.
        const filtro = { $or: [{ ativo: false }, { ativo: true, situacao: 'confirmado' }] }
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
                    ativo: 1,
                    professor: 1,
                    aluno: 1,
                    situacao: 1,
                    tema: 1,
                    proposta: 1,
                    resposta: 1,
                    cancelamento: 1,
                    dataCriacao: 1,
                    dataDefesa: 1,
                    confirmadoEm: 1,
                    encerradoEm: 1,
                    fases: 1,
                    reuniao: 1,
                    registro: 1,
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
        for (const orientacao of item) {
            orientacao.eventos = linhaDoTempo (orientacao);
            delete orientacao.fases;
        }
        res.status (200).json ({ item });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({msg: 'Erro ao buscar histórico'});
    }
}

function atividadeMaisRecente (orientacao, userTipo) {
    const candidatos = [];
    const considerar = (data, detalhe) => {
        if (data) candidatos.push ({ ...detalhe, data: new Date (data) });
    };
    if (userTipo === 'aluno' && orientacao.situacao === 'confirmado') {
        considerar (orientacao.confirmadoEm, { tipo: 'confirmacao', texto: '', fase: '' });
    }
    for (const fase of orientacao.fases || []) {
        if (userTipo === 'professor') {
            for (const arquivo of fase.arquivos || []) {
                considerar (arquivo.dataEnvio, { tipo: 'arquivo', texto: arquivo.originalname, fase: fase.nome });
            }
        }
        if (userTipo === 'aluno') {
            considerar (fase.prazoAlteradoEm, { tipo: 'prazo', texto: fase.prazo, fase: fase.nome });
            considerar (fase.aprovadaEm, { tipo: 'aprovacao', texto: fase.nome, fase: fase.nome });
        }
        for (const atividade of fase.atividades || []) {
            if (userTipo === 'aluno') {
                considerar (atividade.criadaEm, { tipo: 'atividade', texto: atividade.titulo, fase: fase.nome });
            } else {
                // Entregas do aluno: arquivos enviados ou resposta em texto.
                for (const arquivo of atividade.arquivos || []) {
                    considerar (arquivo.dataEnvio, { tipo: 'atividade-entrega', texto: atividade.titulo, fase: fase.nome });
                }
                if (atividade.tipo === 'texto' && atividade.resposta) {
                    considerar (atividade.concluidaEm, { tipo: 'atividade-entrega', texto: atividade.titulo, fase: fase.nome });
                }
            }
        }
        for (const comentario of fase.comentarios || []) {
            if (comentario.autor === userTipo) continue;
            considerar (comentario.data, { tipo: 'comentario', texto: comentario.texto, fase: fase.nome });
        }
    }
    if (orientacao.cancelamento?.solicitadoPor === userTipo) {
        considerar (orientacao.cancelamento?.resposta?.data, { tipo: 'cancelamento-resposta', texto: orientacao.cancelamento.resposta, fase: '' });
    }
    // Ações da outra pessoa guardadas no registro (reunião marcada, atividade removida/reaberta etc.).
    const outro = userTipo === 'aluno' ? '{professor}' : '{aluno}';
    for (const evento of orientacao.registro || []) {
        if (!evento.texto?.startsWith (outro)) continue;
        const texto = evento.texto.replaceAll ('{professor}', 'O orientador').replaceAll ('{aluno}', 'O aluno');
        considerar (evento.data, { tipo: 'registro', texto, fase: '' });
    }
    // Encerramento feito pela outra pessoa.
    const auto = orientacao.resposta?.startsWith ('Cancelado automaticamente');
    const encerrado = (texto) => considerar (orientacao.encerradoEm, { tipo: 'registro', texto, fase: '' });
    if (userTipo === 'aluno') {
        if (orientacao.situacao === 'concluido') encerrado ('O orientador concluiu sua orientação. Parabéns! 🎓');
        if (orientacao.situacao === 'negado') encerrado ('O orientador recusou seu pedido de orientação.');
        if (orientacao.situacao === 'cancelado' && orientacao.cancelamento?.solicitadoPor === 'professor') encerrado ('O orientador cancelou a orientação.');
    } else if (orientacao.situacao === 'cancelado' && !orientacao.cancelamento?.data) {
        encerrado (auto ? 'Pedido cancelado: o aluno foi aceito por outro professor.' : 'O aluno retirou o pedido de orientação.');
    }
    if (!candidatos.length) return null;
    const desde = userTipo === 'aluno' ? orientacao.ultimaVisualizacaoAluno : orientacao.ultimaVisualizacaoProfessor;
    const dataDesde = desde ? new Date (desde) : new Date (0);
    const maisRecente = candidatos.reduce ((a, b) => (b.data > a.data ? b : a));
    const naoLidas = candidatos.filter ((c) => c.data > dataDesde).length;
    return { detalhe: maisRecente, lida: naoLidas === 0, naoLidas };
}

async function criar (req, res) {
    try {
        let orientacao = await Model.findOne (
            { ativo: true, aluno: req.body.aluno, professor: req.body.professor });
        if (orientacao) return res.status (400).json ({ msg: "Pedido de orientação já realizada." });
        const jaOrientado = await Model.exists ({ ativo: true, aluno: req.body.aluno, situacao: 'confirmado' });
        if (jaOrientado) return res.status (400).json ({ msg: "Você já possui um orientador. Cada aluno só pode ter um orientador." });
        const novo = new Model ({
            ativo: true,
            aluno: req.body.aluno,
            professor: req.body.professor,
            proposta: req.body.proposta,
        });
        await novo.save ();
        notificar (novo._id, 'SOTCC - Solicitação de orientação', (aluno, professor) => ({
            aluno: `<h3>Você solicitou uma orientação com o professor ${professor}.</h3><p>Aguarde a resposta do professor.</p>`,
            professor: `<h3>O aluno ${aluno} solicitou uma orientação com você.</h3><p>Entre para ver a proposta e responder.</p>`,
        }));
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
            if (req.body.situacao === 'negado') {
                orientacao.encerradoEm = new Date ();
            }
            if (req.body.situacao === 'confirmado') {
                const jaOrientado = await Model.exists ({ ativo: true, aluno: orientacao.aluno, situacao: 'confirmado', _id: { $ne: orientacao._id } });
                if (jaOrientado) return res.status (400).json ({ msg: 'Este aluno já possui um orientador.' });
                orientacao.confirmadoEm = new Date ();
            }
            msg = 'Resposta enviada.'
        }
        if (userTipo === 'aluno') {
            if (orientacao.situacao === 'confirmado') {
                return res.status (400).json ({ msg: 'Para uma orientação confirmada, solicite o cancelamento.' });
            }
            orientacao.ativo = false;
            orientacao.encerradoEm = new Date ();
            orientacao.situacao = 'cancelado';
            msg = 'Pedido de orientação cancelada.'
        }
        await orientacao.save ();
        if (userTipo === 'professor' && req.body.situacao === 'confirmado') {
            const filtro = { ativo: true, aluno: orientacao.aluno, situacao: 'pendente', _id: { $ne: orientacao._id } };
            const outrosPedidos = await Model.find (filtro, '_id');
            await Model.updateMany (filtro,
                { $set: { ativo: false, encerradoEm: new Date (), situacao: 'cancelado', resposta: 'Cancelado automaticamente: você foi aceito por outro professor.' } }
            );
            for (const pedido of outrosPedidos) {
                notificar (pedido._id, 'SOTCC - Pedido de orientação cancelado', (aluno, professor) => ({
                    aluno: `<h3>Seu pedido de orientação com o professor ${professor} foi cancelado automaticamente, pois você já foi aceito por outro professor.</h3>`,
                    professor: `<h3>O pedido de orientação do aluno ${aluno} foi cancelado automaticamente, pois ele já foi aceito por outro professor.</h3>`,
                }));
            }
        }
        if (userTipo === 'professor') {
            const aceita = req.body.situacao === 'confirmado';
            const resposta = orientacao.resposta ? `<p>Resposta: ${orientacao.resposta}</p>` : '';
            notificar (orientacao._id, aceita ? 'SOTCC - Orientação aceita' : 'SOTCC - Orientação recusada', (aluno, professor) => ({
                aluno: `<h3>O professor ${professor} ${aceita ? 'aceitou' : 'recusou'} seu pedido de orientação.</h3>${resposta}`,
                professor: `<h3>Você ${aceita ? 'aceitou' : 'recusou'} o pedido de orientação do aluno ${aluno}.</h3>${resposta}`,
            }));
        }
        if (userTipo === 'aluno') {
            notificar (orientacao._id, 'SOTCC - Pedido de orientação retirado', (aluno, professor) => ({
                aluno: `<h3>Você retirou seu pedido de orientação com o professor ${professor}.</h3>`,
                professor: `<h3>O aluno ${aluno} retirou o pedido de orientação com você.</h3>`,
            }));
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
        orientacao.encerradoEm = new Date ();
        await orientacao.save ();
        notificar (orientacao._id, 'SOTCC - Orientação concluída', (aluno, professor) => ({
            aluno: `<h3>Parabéns! O professor ${professor} concluiu sua orientação.</h3>`,
            professor: `<h3>Você concluiu a orientação do aluno ${aluno}.</h3>`,
        }));
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

export { atividadeMaisRecente, listar, criar, deletar, alterarSituacao, editar, pegarPorId, orientacaoPorProfessor, listarPublicas, concluirOrientacao, historico, marcarNotificacoesVistas };
