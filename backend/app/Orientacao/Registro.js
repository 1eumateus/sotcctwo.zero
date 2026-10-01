// Linha do tempo da orientação.
// Eventos são montados a partir do estado atual (datas já salvas no documento) e de
// `orientacao.registro`, que guarda o que seria perdido quando algo é removido ou sobrescrito.
// Textos usam {aluno} e {professor}, trocados pelos nomes na hora de exibir.

function formatarDia (data) {
    const d = new Date (data);
    return `${String (d.getUTCDate ()).padStart (2, '0')}/${String (d.getUTCMonth () + 1).padStart (2, '0')}/${d.getUTCFullYear ()}`;
}

function formatarDiaHora (data) {
    const d = new Date (data);
    return `${formatarDia (d)} às ${String (d.getUTCHours ()).padStart (2, '0')}:${String (d.getUTCMinutes ()).padStart (2, '0')}`;
}

const motivo = (m) => m ? `. Motivo: ${m}` : '';
const evento = (data, texto) => data ? [{ data, texto }] : [];

function eventosCancelamento (c) {
    // O professor cancela direto; só o aluno precisa pedir.
    if (c?.solicitadoPor === 'professor') return evento (c.data, `{professor} cancelou a orientação${motivo (c.motivo)}`);
    if (!c?.data) return [];
    return [
        ...evento (c.data, `{aluno} solicitou o cancelamento${motivo (c.motivo)}`),
        ...evento (c.resposta?.data, `{professor} ${c.resposta?.aceito ? 'aceitou' : 'recusou'} o cancelamento${motivo (c.resposta?.motivo)}`),
    ];
}

function eventoEnvioAtividade (atividade, arquivo) {
    return evento (arquivo.dataEnvio, `{aluno} enviou "${arquivo.originalname}" na atividade "${atividade.titulo}"`);
}

function eventoConclusaoAtividade (fase, atividade) {
    return evento (atividade.concluidaEm, `Atividade concluída em "${fase.nome}": ${atividade.titulo}`);
}

function eventosAtividade (fase, atividade) {
    return [
        ...evento (atividade.criadaEm, `Nova atividade em "${fase.nome}": ${atividade.titulo}`),
        ...(atividade.arquivos || []).flatMap ((arquivo) => eventoEnvioAtividade (atividade, arquivo)),
        ...eventoConclusaoAtividade (fase, atividade),
    ];
}

function eventoArquivoFase (fase, arquivo) {
    return evento (arquivo.dataEnvio, `{aluno} enviou o arquivo "${arquivo.originalname}" em "${fase.nome}"`);
}

function eventoComentario (fase, comentario) {
    return evento (comentario.data, `{${comentario.autor === 'aluno' ? 'aluno' : 'professor'}} comentou em "${fase.nome}"`);
}

function eventoPrazo (fase) {
    return fase.prazo ? evento (fase.prazoAlteradoEm, `Prazo de "${fase.nome}" definido para ${formatarDia (fase.prazo)}`) : [];
}

function eventoReuniao (orientacao) {
    return evento (orientacao.reuniao?.iniciadaEm, 'Reunião realizada');
}

// Guarda eventos no registro permanente da orientação (salvo no próximo save).
function registrar (orientacao, ...listas) {
    orientacao.registro.push (...listas.flat ());
}

// Mais recentes primeiro.
function linhaDoTempo (o) {
    const eventos = [
        ...evento (o.dataCriacao, '{aluno} solicitou orientação com {professor}'),
        ...evento (o.confirmadoEm, '{professor} aceitou a orientação'),
        ...(o.fases || []).flatMap ((fase) => [
            ...(fase.atividades || []).flatMap ((atividade) => eventosAtividade (fase, atividade)),
            ...(fase.arquivos || []).flatMap ((arquivo) => eventoArquivoFase (fase, arquivo)),
            ...(fase.comentarios || []).flatMap ((comentario) => eventoComentario (fase, comentario)),
            ...eventoPrazo (fase),
            ...evento (fase.aprovadaEm, `Fase "${fase.nome}" aprovada`),
        ]),
        ...eventoReuniao (o),
        ...eventosCancelamento (o.cancelamento),
        ...(o.registro || []),
    ];
    if (o.encerradoEm) {
        if (o.situacao === 'concluido') eventos.push (...evento (o.encerradoEm, 'Orientação concluída'));
        else if (o.situacao === 'negado') eventos.push (...evento (o.encerradoEm, '{professor} recusou a orientação'));
        else if (!o.cancelamento?.data) {
            eventos.push (...evento (o.encerradoEm, o.resposta?.startsWith ('Cancelado automaticamente')
                ? 'Pedido cancelado: {aluno} foi aceito por outro professor'
                : '{aluno} retirou o pedido'));
        }
    }
    const aluno = o.aluno?.nome || 'Aluno';
    const professor = o.professor?.nome || 'Professor';
    return eventos
        .map ((e) => ({ data: e.data, texto: e.texto.replaceAll ('{aluno}', aluno).replaceAll ('{professor}', professor) }))
        .sort ((a, b) => new Date (b.data) - new Date (a.data));
}

export {
    linhaDoTempo, registrar, formatarDiaHora,
    eventosCancelamento, eventosAtividade, eventoEnvioAtividade, eventoConclusaoAtividade,
    eventoArquivoFase, eventoComentario, eventoPrazo, eventoReuniao,
};
