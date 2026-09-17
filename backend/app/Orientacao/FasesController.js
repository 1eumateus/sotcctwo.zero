import Model from "./Model.js";
import jwt from "jsonwebtoken";
import fs from 'fs';
import { sendEmail } from '../shared/Mailer.js';

function formatarData (value) {
    if (!value) return '';
    const data = new Date (value);
    const ano = data.getUTCFullYear ();
    const mes = String (data.getUTCMonth () + 1).padStart (2, '0');
    const dia = String (data.getUTCDate ()).padStart (2, '0');
    return `${dia}/${mes}/${ano}`;
}

function temCancelamentoPendente (orientacao) {
    return !!orientacao.cancelamento?.solicitadoPor && !orientacao.cancelamento?.resposta?.data;
}

const MSG_CANCELAMENTO_PENDENTE = 'Ação suspensa: há uma solicitação de cancelamento pendente nesta orientação.';

async function visualizarFases (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id });
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (userTipo === 'aluno' && String (orientacao.aluno) === String (userID)) {
            orientacao.ultimaVisualizacaoAluno = new Date ();
        } else if (userTipo === 'professor' && String (orientacao.professor) === String (userID)) {
            orientacao.ultimaVisualizacaoProfessor = new Date ();
        } else {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        await orientacao.save ();
        res.status (200).json ({});
    } catch (error) {
        console.log (error);
        return res.status (400).json ({});
    }
}

async function enviarArquivoFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o aluno desta orientação pode enviar arquivos.' });
        }
        if (orientacao.situacao !== 'confirmado') {
            return res.status (400).json ({ msg: 'Orientação ainda não confirmada.' });
        }
        const faseIndex = Number (req.params.faseIndex);
        const fase = orientacao.fases [faseIndex];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        const faseAtualIndex = orientacao.fases.findIndex ((f) => f.situacao !== 'aprovada');
        if (faseAtualIndex !== -1 && faseIndex !== faseAtualIndex) {
            return res.status (400).json ({ msg: 'Você só pode enviar arquivos para a fase atual.' });
        }
        if (!req.file) return res.status (400).json ({ msg: 'Nenhum arquivo enviado.' });
        fase.arquivos.push ({
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
        });
        await orientacao.save ();
        res.status (200).json ({ msg: 'Arquivo enviado com sucesso.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao enviar arquivo.' });
    }
}

async function removerArquivoFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o aluno desta orientação pode remover arquivos.' });
        }
        const faseIndex = Number (req.params.faseIndex);
        const fase = orientacao.fases [faseIndex];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível remover arquivos.' });
        }
        const arquivo = fase.arquivos.id (req.params.arquivoId);
        if (!arquivo) return res.status (404).json ({ msg: 'Arquivo não encontrado.' });
        const ultimoArquivo = fase.arquivos [fase.arquivos.length - 1];
        if (String (ultimoArquivo._id) !== String (arquivo._id)) {
            return res.status (400).json ({ msg: 'Só é possível remover o último arquivo enviado.' });
        }
        if (arquivo.path && fs.existsSync (arquivo.path)) {
            fs.unlinkSync (arquivo.path);
        }
        arquivo.deleteOne ();
        await orientacao.save ();
        res.status (200).json ({ msg: 'Arquivo removido.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao remover arquivo.' });
    }
}

async function definirDescricaoFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o aluno desta orientação pode editar a descrição.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível editar a descrição.' });
        }
        fase.descricao = req.body.descricao?.trim () || '';
        fase.descricaoAlteradaEm = new Date ();
        await orientacao.save ();
        res.status (200).json ({ msg: 'Descrição salva.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao salvar descrição.' });
    }
}

async function comentarFase (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id }).populate ('aluno professor', 'nome email');
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        const dono = userTipo === 'aluno' ? orientacao.aluno._id : orientacao.professor._id;
        if (userTipo === 'admin' || String (dono) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        if (!req.body.texto?.trim ()) return res.status (400).json ({ msg: 'Escreva um comentário.' });
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        const comentario = { autor: userTipo, texto: req.body.texto.trim () };
        if (req.file) {
            comentario.anexo = {
                originalname: req.file.originalname,
                filename: req.file.filename,
                path: req.file.path,
                size: req.file.size,
            };
        }
        fase.comentarios.push (comentario);
        await orientacao.save ();
        const destinatario = userTipo === 'aluno' ? orientacao.professor : orientacao.aluno;
        if (destinatario?.email) {
            sendEmail (
                destinatario.email,
                'SOTCC - Novo comentário na sua orientação',
                `<h3>${userTipo === 'aluno' ? 'O aluno' : 'O orientador'} comentou na fase "${fase.nome}":</h3><p>${req.body.texto.trim ()}</p><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a>`,
            );
        }
        res.status (200).json ({ msg: 'Comentário enviado.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao enviar comentário.' });
    }
}

async function removerComentarioFase (req, res) {
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
        const dono = userTipo === 'aluno' ? orientacao.aluno : orientacao.professor;
        if (userTipo === 'admin' || String (dono) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        const comentario = fase.comentarios.id (req.params.comentarioId);
        if (!comentario) return res.status (404).json ({ msg: 'Comentário não encontrado.' });
        if (comentario.autor !== userTipo) {
            return res.status (403).json ({ msg: 'Você só pode remover seus próprios comentários.' });
        }
        if (comentario.anexo?.path && fs.existsSync (comentario.anexo.path)) {
            fs.unlinkSync (comentario.anexo.path);
        }
        comentario.deleteOne ();
        await orientacao.save ();
        res.status (200).json ({ msg: 'Comentário removido.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao remover comentário.' });
    }
}

async function editarComentarioFase (req, res) {
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
        const dono = userTipo === 'aluno' ? orientacao.aluno : orientacao.professor;
        if (userTipo === 'admin' || String (dono) !== String (userID)) {
            return res.status (403).json ({ msg: 'Você não faz parte desta orientação.' });
        }
        if (!req.body.texto?.trim ()) return res.status (400).json ({ msg: 'Escreva um comentário.' });
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        const comentario = fase.comentarios.id (req.params.comentarioId);
        if (!comentario) return res.status (404).json ({ msg: 'Comentário não encontrado.' });
        if (comentario.autor !== userTipo) {
            return res.status (403).json ({ msg: 'Você só pode editar seus próprios comentários.' });
        }
        comentario.texto = req.body.texto.trim ();
        comentario.editado = true;
        await orientacao.save ();
        res.status (200).json ({ msg: 'Comentário atualizado.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao editar comentário.' });
    }
}

async function avaliarFase (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id }).populate ('aluno', 'email');
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        if (userTipo !== 'professor' || String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Apenas o orientador desta orientação pode aprovar fases.' });
        }
        const faseIndex = Number (req.params.faseIndex);
        const fase = orientacao.fases [faseIndex];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        fase.situacao = 'aprovada';
        fase.aprovadaEm = new Date ();
        if (req.body.texto?.trim ()) {
            fase.comentarios.push ({ autor: 'professor', texto: req.body.texto.trim () });
        }
        await orientacao.save ();
        if (orientacao.aluno?.email) {
            sendEmail (
                orientacao.aluno.email,
                'SOTCC - Fase aprovada',
                `<h3>O orientador aprovou a fase "${fase.nome}".</h3><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a>`,
            );
        }
        res.status (200).json ({ msg: 'Fase aprovada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao aprovar fase.' });
    }
}

async function definirPrazoFase (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id }).populate ('aluno', 'email');
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        if (userTipo !== 'professor' || String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Apenas o orientador desta orientação pode definir prazos.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        fase.prazo = req.body.prazo || null;
        fase.prazoAlteradoEm = new Date ();
        fase.lembretePrazoEnviado = false;
        await orientacao.save ();
        if (fase.prazo && orientacao.aluno?.email) {
            sendEmail (
                orientacao.aluno.email,
                'SOTCC - Novo prazo definido',
                `<h3>Um novo prazo foi definido para a fase "${fase.nome}": ${formatarData (fase.prazo)}.</h3><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a>`,
            );
        }
        res.status (200).json ({ msg: 'Prazo atualizado.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao definir prazo.' });
    }
}

async function criarAtividadeFase (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ ativo: true, _id: req.params.id }).populate ('aluno', 'email');
        if (!orientacao) return res.status (404).json ({ msg: 'Orientação não encontrada.' });
        if (temCancelamentoPendente (orientacao)) return res.status (400).json ({ msg: MSG_CANCELAMENTO_PENDENTE });
        if (userTipo !== 'professor' || String (orientacao.professor) !== String (userID)) {
            return res.status (403).json ({ msg: 'Apenas o orientador desta orientação pode criar atividades.' });
        }
        if (!req.body.titulo?.trim ()) return res.status (400).json ({ msg: 'Escreva um título para a atividade.' });
        const tipo = req.body.tipo === 'arquivo' ? 'arquivo' : 'texto';
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        fase.atividades.push ({ titulo: req.body.titulo.trim (), tipo, prazo: req.body.prazo || null });
        await orientacao.save ();
        if (orientacao.aluno?.email) {
            sendEmail (
                orientacao.aluno.email,
                'SOTCC - Nova atividade',
                `<h3>Uma nova atividade foi criada na fase "${fase.nome}": ${req.body.titulo.trim ()}</h3><a href='${process.env.HOST_ROOT}/ui/login'>Clique aqui para entrar no sistema.</a>`,
            );
        }
        res.status (200).json ({ msg: 'Atividade criada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao criar atividade.' });
    }
}

async function editarAtividadeFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o orientador desta orientação pode editar atividades.' });
        }
        if (!req.body.titulo?.trim ()) return res.status (400).json ({ msg: 'Escreva um título para a atividade.' });
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        atividade.titulo = req.body.titulo.trim ();
        atividade.prazo = req.body.prazo || null;
        await orientacao.save ();
        res.status (200).json ({ msg: 'Atividade atualizada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao editar atividade.' });
    }
}

async function concluirAtividadeFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o orientador desta orientação pode marcar atividades como concluídas.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        atividade.concluida = !!req.body.concluida;
        atividade.concluidaEm = atividade.concluida ? new Date () : null;
        await orientacao.save ();
        res.status (200).json ({ msg: atividade.concluida ? 'Atividade concluída.' : 'Atividade reaberta.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao atualizar atividade.' });
    }
}

async function removerAtividadeFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o orientador desta orientação pode remover atividades.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        atividade.deleteOne ();
        await orientacao.save ();
        res.status (200).json ({ msg: 'Atividade removida.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao remover atividade.' });
    }
}

async function responderAtividadeFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o aluno desta orientação pode responder atividades.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível responder atividades.' });
        }
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        if (atividade.tipo !== 'texto') return res.status (400).json ({ msg: 'Esta atividade pede o envio de um arquivo.' });
        if (!req.body.texto?.trim ()) return res.status (400).json ({ msg: 'Escreva uma resposta.' });
        atividade.resposta = req.body.texto.trim ();
        atividade.concluida = true;
        atividade.concluidaEm = new Date ();
        await orientacao.save ();
        res.status (200).json ({ msg: 'Resposta enviada.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao enviar resposta.' });
    }
}

async function enviarArquivoAtividadeFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o aluno desta orientação pode enviar arquivos.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível enviar arquivos.' });
        }
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        if (atividade.tipo !== 'arquivo') return res.status (400).json ({ msg: 'Esta atividade pede uma resposta em texto.' });
        if (!req.file) return res.status (400).json ({ msg: 'Nenhum arquivo enviado.' });
        atividade.arquivos.push ({
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
        });
        atividade.concluida = true;
        atividade.concluidaEm = new Date ();
        await orientacao.save ();
        res.status (200).json ({ msg: 'Arquivo enviado.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao enviar arquivo.' });
    }
}

async function removerArquivoAtividadeFase (req, res) {
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
            return res.status (403).json ({ msg: 'Apenas o aluno desta orientação pode remover arquivos.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível remover arquivos.' });
        }
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        const arquivo = atividade.arquivos.id (req.params.arquivoId);
        if (!arquivo) return res.status (404).json ({ msg: 'Arquivo não encontrado.' });
        const ultimoArquivo = atividade.arquivos [atividade.arquivos.length - 1];
        if (String (ultimoArquivo._id) !== String (arquivo._id)) {
            return res.status (400).json ({ msg: 'Só é possível remover o último arquivo enviado.' });
        }
        if (arquivo.path && fs.existsSync (arquivo.path)) {
            fs.unlinkSync (arquivo.path);
        }
        arquivo.deleteOne ();
        if (atividade.arquivos.length === 0) {
            atividade.concluida = false;
            atividade.concluidaEm = null;
        }
        await orientacao.save ();
        res.status (200).json ({ msg: 'Arquivo removido.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao remover arquivo.' });
    }
}

export { visualizarFases, enviarArquivoFase, removerArquivoFase, comentarFase, removerComentarioFase, editarComentarioFase, avaliarFase, definirPrazoFase, definirDescricaoFase, criarAtividadeFase, editarAtividadeFase, concluirAtividadeFase, removerAtividadeFase, responderAtividadeFase, enviarArquivoAtividadeFase, removerArquivoAtividadeFase, temCancelamentoPendente, MSG_CANCELAMENTO_PENDENTE };
