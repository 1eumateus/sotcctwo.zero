import Model from "./Model.js";
import jwt from "jsonwebtoken";
import fs from 'fs';
import { notificar } from './Notificar.js';
import { registrar, eventoArquivoFase, eventoComentario, eventoPrazo, eventosAtividade, eventoEnvioAtividade, eventoConclusaoAtividade } from './Registro.js';

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

// Só a fase atual (primeira não aprovada) e as já aprovadas podem ser usadas; as seguintes ficam bloqueadas.
function faseBloqueada (orientacao, indice) {
    const atual = orientacao.fases.findIndex ((f) => f.situacao !== 'aprovada');
    return atual !== -1 && Number (indice) > atual;
}
const MSG_FASE_BLOQUEADA = 'Esta fase ainda está bloqueada. Ela é liberada quando a fase anterior for aprovada.';

async function visualizarFases (req, res) {
    try {
        const token = req.headers.authorization;
        const {userID, userTipo} = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);
        const orientacao = await Model.findOne ({ _id: req.params.id });
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
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
        registrar (orientacao, eventoArquivoFase (fase, arquivo), [{ data: new Date (), texto: `{aluno} removeu o arquivo "${arquivo.originalname}" de "${fase.nome}"` }]);
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
            return res.status (403).json ({ msg: 'Apenas o aluno desta orientação pode definir o tema.' });
        }
        const fase = orientacao.fases [Number (req.params.faseIndex)];
        if (!fase) return res.status (404).json ({ msg: 'Fase não encontrada.' });
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível alterar o tema.' });
        }
        const anterior = fase.descricao?.trim () || '';
        const tema = req.body.descricao?.trim () || '';
        if (tema === anterior) return res.status (200).json ({ msg: 'Tema salvo.' });
        fase.descricao = tema;
        fase.descricaoAlteradaEm = new Date ();
        const acao = !tema ? 'removeu o tema do TCC' : anterior ? `alterou o tema do TCC para "${tema}"` : `definiu o tema do TCC: "${tema}"`;
        registrar (orientacao, [{ data: fase.descricaoAlteradaEm, texto: `{aluno} ${acao}` }]);
        await orientacao.save ();
        if (tema) {
            notificar (orientacao._id, 'SOTCC - Tema do TCC', (aluno) => ({
                aluno: `<h3>Você ${anterior ? 'alterou' : 'definiu'} o tema do seu TCC.</h3><p>${tema}</p>`,
                professor: `<h3>O aluno ${aluno} ${anterior ? 'alterou' : 'definiu'} o tema do TCC.</h3><p>${tema}</p>`,
            }));
        }
        res.status (200).json ({ msg: 'Tema salvo.' });
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: 'Erro ao salvar o tema.' });
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
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
        const texto = `<p>${req.body.texto.trim ()}</p>`;
        notificar (orientacao._id, 'SOTCC - Novo comentário na orientação', (aluno, professor) => ({
            aluno: userTipo === 'aluno'
                ? `<h3>Você comentou na fase "${fase.nome}":</h3>${texto}`
                : `<h3>O professor ${professor} comentou na fase "${fase.nome}":</h3>${texto}`,
            professor: userTipo === 'aluno'
                ? `<h3>O aluno ${aluno} comentou na fase "${fase.nome}":</h3>${texto}`
                : `<h3>Você comentou na fase "${fase.nome}" do aluno ${aluno}:</h3>${texto}`,
        }));
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        const comentario = fase.comentarios.id (req.params.comentarioId);
        if (!comentario) return res.status (404).json ({ msg: 'Comentário não encontrado.' });
        if (comentario.autor !== userTipo) {
            return res.status (403).json ({ msg: 'Você só pode remover seus próprios comentários.' });
        }
        if (comentario.anexo?.path && fs.existsSync (comentario.anexo.path)) {
            fs.unlinkSync (comentario.anexo.path);
        }
        registrar (orientacao, eventoComentario (fase, comentario), [{ data: new Date (), texto: `{${userTipo}} removeu um comentário em "${fase.nome}"` }]);
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        const comentario = fase.comentarios.id (req.params.comentarioId);
        if (!comentario) return res.status (404).json ({ msg: 'Comentário não encontrado.' });
        if (comentario.autor !== userTipo) {
            return res.status (403).json ({ msg: 'Você só pode editar seus próprios comentários.' });
        }
        comentario.texto = req.body.texto.trim ();
        comentario.editado = true;
        registrar (orientacao, [{ data: new Date (), texto: `{${userTipo}} editou um comentário em "${fase.nome}"` }]);
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        fase.situacao = 'aprovada';
        fase.aprovadaEm = new Date ();
        if (req.body.texto?.trim ()) {
            fase.comentarios.push ({ autor: 'professor', texto: req.body.texto.trim () });
        }
        await orientacao.save ();
        notificar (orientacao._id, 'SOTCC - Fase aprovada', (aluno, professor) => ({
            aluno: `<h3>O professor ${professor} aprovou a fase "${fase.nome}".</h3>`,
            professor: `<h3>Você aprovou a fase "${fase.nome}" do aluno ${aluno}.</h3>`,
        }));
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') return res.status (400).json ({ msg: 'Fase já aprovada, não é possível alterar o prazo.' });
        registrar (orientacao, eventoPrazo (fase));
        fase.prazo = req.body.prazo || null;
        fase.prazoAlteradoEm = new Date ();
        if (!fase.prazo) registrar (orientacao, [{ data: fase.prazoAlteradoEm, texto: `Prazo de "${fase.nome}" removido` }]);
        fase.lembretePrazoEnviado = false;
        await orientacao.save ();
        if (fase.prazo) {
            notificar (orientacao._id, 'SOTCC - Novo prazo definido', (aluno, professor) => ({
                aluno: `<h3>O professor ${professor} definiu o prazo da fase "${fase.nome}" para ${formatarData (fase.prazo)}.</h3>`,
                professor: `<h3>Você definiu o prazo da fase "${fase.nome}" do aluno ${aluno} para ${formatarData (fase.prazo)}.</h3>`,
            }));
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') return res.status (400).json ({ msg: 'Fase já aprovada, não é possível criar atividades.' });
        fase.atividades.push ({ titulo: req.body.titulo.trim (), tipo, prazo: req.body.prazo || null });
        await orientacao.save ();
        const titulo = req.body.titulo.trim ();
        notificar (orientacao._id, 'SOTCC - Nova atividade', (aluno, professor) => ({
            aluno: `<h3>O professor ${professor} criou uma nova atividade na fase "${fase.nome}": ${titulo}</h3>`,
            professor: `<h3>Você criou a atividade "${titulo}" na fase "${fase.nome}" do aluno ${aluno}.</h3>`,
        }));
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') return res.status (400).json ({ msg: 'Fase já aprovada, não é possível editar atividades.' });
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        if (atividade.titulo !== req.body.titulo.trim ()) {
            registrar (orientacao, [{ data: new Date (), texto: `{professor} renomeou a atividade "${atividade.titulo}" para "${req.body.titulo.trim ()}"` }]);
        }
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') return res.status (400).json ({ msg: 'Fase já aprovada, não é possível alterar atividades.' });
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        registrar (orientacao, eventoConclusaoAtividade (fase, atividade));
        atividade.concluida = !!req.body.concluida;
        atividade.concluidaEm = atividade.concluida ? new Date () : null;
        if (!atividade.concluida) registrar (orientacao, [{ data: new Date (), texto: `{professor} reabriu a atividade "${atividade.titulo}"` }]);
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') return res.status (400).json ({ msg: 'Fase já aprovada, não é possível remover atividades.' });
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        registrar (orientacao, eventosAtividade (fase, atividade), [{ data: new Date (), texto: `{professor} removeu a atividade "${atividade.titulo}" de "${fase.nome}"` }]);
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível responder atividades.' });
        }
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        if (atividade.concluida) return res.status (400).json ({ msg: 'Atividade já entregue. Peça ao orientador para reabrir se precisar alterar.' });
        if (atividade.tipo !== 'texto') return res.status (400).json ({ msg: 'Esta atividade pede o envio de um arquivo.' });
        if (!req.body.texto?.trim ()) return res.status (400).json ({ msg: 'Escreva uma resposta.' });
        registrar (orientacao, eventoConclusaoAtividade (fase, atividade));
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível enviar arquivos.' });
        }
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        if (atividade.concluida) return res.status (400).json ({ msg: 'Atividade já entregue. Peça ao orientador para reabrir se precisar alterar.' });
        if (atividade.tipo !== 'arquivo') return res.status (400).json ({ msg: 'Esta atividade pede uma resposta em texto.' });
        if (!req.file) return res.status (400).json ({ msg: 'Nenhum arquivo enviado.' });
        atividade.arquivos.push ({
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
        });
        registrar (orientacao, eventoConclusaoAtividade (fase, atividade));
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
        if (faseBloqueada (orientacao, req.params.faseIndex)) return res.status (400).json ({ msg: MSG_FASE_BLOQUEADA });
        if (fase.situacao === 'aprovada') {
            return res.status (400).json ({ msg: 'Fase já aprovada, não é possível remover arquivos.' });
        }
        const atividade = fase.atividades.id (req.params.atividadeId);
        if (!atividade) return res.status (404).json ({ msg: 'Atividade não encontrada.' });
        if (atividade.concluida) return res.status (400).json ({ msg: 'Atividade já entregue. Peça ao orientador para reabrir se precisar alterar.' });
        const arquivo = atividade.arquivos.id (req.params.arquivoId);
        if (!arquivo) return res.status (404).json ({ msg: 'Arquivo não encontrado.' });
        const ultimoArquivo = atividade.arquivos [atividade.arquivos.length - 1];
        if (String (ultimoArquivo._id) !== String (arquivo._id)) {
            return res.status (400).json ({ msg: 'Só é possível remover o último arquivo enviado.' });
        }
        if (arquivo.path && fs.existsSync (arquivo.path)) {
            fs.unlinkSync (arquivo.path);
        }
        registrar (orientacao, eventoEnvioAtividade (atividade, arquivo), [{ data: new Date (), texto: `{aluno} removeu "${arquivo.originalname}" da atividade "${atividade.titulo}"` }]);
        arquivo.deleteOne ();
        if (atividade.arquivos.length === 0) {
            registrar (orientacao, eventoConclusaoAtividade (fase, atividade));
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
