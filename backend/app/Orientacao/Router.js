import express from "express";
import { listar, pegarPorId, alterarSituacao, criar, deletar, editar, orientacaoPorProfessor, listarPublicas, concluirOrientacao, historico, marcarNotificacoesVistas } from "./Controller.js";
import { visualizarFases, enviarArquivoFase, removerArquivoFase, comentarFase, removerComentarioFase, editarComentarioFase, avaliarFase, definirPrazoFase, definirDescricaoFase, criarAtividadeFase, editarAtividadeFase, concluirAtividadeFase, removerAtividadeFase, responderAtividadeFase, enviarArquivoAtividadeFase, removerArquivoAtividadeFase } from "./FasesController.js";
import { solicitarCancelamento, cancelarOrientacao, responderCancelamento, retirarCancelamento } from "./CancelamentoController.js";
import { gerarConvite } from "./ConviteController.js";
import { gerarTokenVideochamada, encerrarVideochamada, gerarTokenVideochamadaPublico, criarReuniao, entrarReuniao, agendarReuniao, encerrarReuniao } from "./VideochamadaController.js";
import { makeUpload } from "../shared/Multer.js";

const router = express.Router ();

const uploadFase = makeUpload ({
    randomizeFilename: true,
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb (null, true);
        } else {
            cb (new Error ('Apenas arquivos PDF são permitidos.'));
        }
    },
});

router.post ("/criar", criar);
router.put ("/alterarSituacao", alterarSituacao);
router.put ("/editar", editar);
router.post ("/gerarConvite", gerarConvite);
router.get ("/professor/:id", orientacaoPorProfessor);
router.get ("/publicas", listarPublicas);
router.get ("/historico", historico);
router.put ("/marcarNotificacoesVistas", marcarNotificacoesVistas);
router.put ("/:id/visualizar", visualizarFases);
router.post ("/:id/solicitarCancelamento", solicitarCancelamento);
router.post ("/:id/cancelar", cancelarOrientacao);
router.put ("/:id/responderCancelamento", responderCancelamento);
router.put ("/:id/retirarCancelamento", retirarCancelamento);
router.put ("/:id/concluir", concluirOrientacao);
router.post ("/:id/fases/:faseIndex/arquivo", uploadFase.single ('arquivo'), enviarArquivoFase);
router.delete ("/:id/fases/:faseIndex/arquivo/:arquivoId", removerArquivoFase);
router.post ("/:id/fases/:faseIndex/comentario", uploadFase.single ('anexo'), comentarFase);
router.put ("/:id/fases/:faseIndex/comentario/:comentarioId", editarComentarioFase);
router.delete ("/:id/fases/:faseIndex/comentario/:comentarioId", removerComentarioFase);
router.put ("/:id/fases/:faseIndex/avaliar", avaliarFase);
router.put ("/:id/fases/:faseIndex/prazo", definirPrazoFase);
router.put ("/:id/fases/:faseIndex/descricao", definirDescricaoFase);
router.post ("/:id/fases/:faseIndex/atividade", criarAtividadeFase);
router.put ("/:id/fases/:faseIndex/atividade/:atividadeId", editarAtividadeFase);
router.put ("/:id/fases/:faseIndex/atividade/:atividadeId/concluir", concluirAtividadeFase);
router.delete ("/:id/fases/:faseIndex/atividade/:atividadeId", removerAtividadeFase);
router.put ("/:id/fases/:faseIndex/atividade/:atividadeId/resposta", responderAtividadeFase);
router.post ("/:id/fases/:faseIndex/atividade/:atividadeId/arquivo", uploadFase.single ('arquivo'), enviarArquivoAtividadeFase);
router.delete ("/:id/fases/:faseIndex/atividade/:atividadeId/arquivo/:arquivoId", removerArquivoAtividadeFase);
router.post ("/:id/videochamada/token", gerarTokenVideochamada);
router.put ("/:id/videochamada/encerrar", encerrarVideochamada);
router.post ("/:id/videochamada/token/publico", gerarTokenVideochamadaPublico);
router.post ("/:id/reuniao/criar", criarReuniao);
router.post ("/:id/reuniao/entrar", entrarReuniao);
router.post ("/:id/reuniao/agendar", agendarReuniao);
router.put ("/:id/reuniao/encerrar", encerrarReuniao);
router.get ("/:id", pegarPorId);
router.delete ("/:id", deletar);
router.get ("/", listar);

export default router;