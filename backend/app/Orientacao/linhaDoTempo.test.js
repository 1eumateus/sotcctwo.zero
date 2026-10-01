// node --test app/Orientacao/linhaDoTempo.test.js
import test from 'node:test';
import assert from 'node:assert';
import { linhaDoTempo, registrar, eventosCancelamento, eventosAtividade } from './Registro.js';

const d = (s) => new Date (s);
const base = { aluno: { nome: 'João' }, professor: { nome: 'Ana' } };

test ('mais recentes primeiro, com cancelamento pedido pelo aluno', () => {
    const eventos = linhaDoTempo ({
        ...base, situacao: 'cancelado',
        dataCriacao: d ('2026-01-01T10:00Z'), confirmadoEm: d ('2026-01-02T10:00Z'), encerradoEm: d ('2026-03-01T10:00Z'),
        fases: [{
            nome: 'Proposta', prazo: d ('2026-02-10T00:00Z'), prazoAlteradoEm: d ('2026-01-05T10:00Z'), aprovadaEm: d ('2026-02-01T10:00Z'),
            atividades: [{ titulo: 'Resumo', criadaEm: d ('2026-01-03T10:00Z') }],
            comentarios: [{ autor: 'aluno', data: d ('2026-01-04T10:00Z') }],
        }],
        cancelamento: { solicitadoPor: 'aluno', motivo: 'mudei', data: d ('2026-02-20T10:00Z'), resposta: { aceito: true, data: d ('2026-03-01T10:00Z') } },
    });
    assert.deepEqual (eventos.map ((e) => e.texto), [
        'Ana aceitou o cancelamento',
        'João solicitou o cancelamento. Motivo: mudei',
        'Fase "Proposta" aprovada',
        'Prazo de "Proposta" definido para 10/02/2026',
        'João comentou em "Proposta"',
        'Nova atividade em "Proposta": Resumo',
        'Ana aceitou a orientação',
        'João solicitou orientação com Ana',
    ]);
});

test ('recusa, retirada e conclusão', () => {
    const o = { ...base, dataCriacao: d ('2026-01-01'), encerradoEm: d ('2026-01-02') };
    assert.equal (linhaDoTempo ({ ...o, situacao: 'negado' })[0].texto, 'Ana recusou a orientação');
    assert.equal (linhaDoTempo ({ ...o, situacao: 'cancelado' })[0].texto, 'João retirou o pedido');
    assert.equal (linhaDoTempo ({ ...o, situacao: 'concluido' })[0].texto, 'Orientação concluída');
    assert.equal (linhaDoTempo ({ ...o, situacao: 'cancelado', cancelamento: { solicitadoPor: 'professor', data: d ('2026-01-02') } })[0].texto, 'Ana cancelou a orientação');
});

test ('cancelamento retirado e atividade removida continuam na linha do tempo', () => {
    const o = { ...base, situacao: 'confirmado', dataCriacao: d ('2026-01-01'), registro: [] };
    const fase = { nome: 'Proposta' };
    const atividade = { titulo: 'Resumo', criadaEm: d ('2026-01-02'), arquivos: [{ originalname: 'r.pdf', dataEnvio: d ('2026-01-03') }] };
    registrar (o, eventosAtividade (fase, atividade), [{ data: d ('2026-01-04'), texto: '{professor} removeu a atividade "Resumo"' }]);
    registrar (o, eventosCancelamento ({ solicitadoPor: 'aluno', motivo: 'x', data: d ('2026-01-05') }), [{ data: d ('2026-01-06'), texto: '{aluno} retirou a solicitação de cancelamento' }]);
    assert.deepEqual (linhaDoTempo (o).map ((e) => e.texto), [
        'João retirou a solicitação de cancelamento',
        'João solicitou o cancelamento. Motivo: x',
        'Ana removeu a atividade "Resumo"',
        'João enviou "r.pdf" na atividade "Resumo"',
        'Nova atividade em "Proposta": Resumo',
        'João solicitou orientação com Ana',
    ]);
});

test ('notificação no site: nova atividade para o aluno, entrega e ações do registro para o professor', async () => {
    const { atividadeMaisRecente } = await import ('./Controller.js');
    const o = {
        situacao: 'confirmado', confirmadoEm: d ('2026-01-01'), ultimaVisualizacaoAluno: d ('2026-01-02'), ultimaVisualizacaoProfessor: d ('2026-01-02'),
        fases: [{ nome: 'Proposta', atividades: [{ titulo: 'Resumo', tipo: 'texto', criadaEm: d ('2026-01-03'), resposta: 'ok', concluidaEm: d ('2026-01-04') }] }],
        registro: [],
    };
    const aluno = atividadeMaisRecente (o, 'aluno');
    assert.equal (aluno.detalhe.tipo, 'atividade');
    assert.equal (aluno.lida, false);
    const professor = atividadeMaisRecente (o, 'professor');
    assert.equal (professor.detalhe.tipo, 'atividade-entrega');
    assert.equal (professor.lida, false);
    o.registro.push ({ data: d ('2026-01-05'), texto: '{professor} marcou uma reunião para 10/01/2026 às 14:00' });
    assert.equal (atividadeMaisRecente (o, 'aluno').detalhe.texto, 'O orientador marcou uma reunião para 10/01/2026 às 14:00');
    assert.equal (atividadeMaisRecente (o, 'professor').detalhe.tipo, 'atividade-entrega', 'ação do próprio professor não notifica ele');
});

test ('notificações do professor', async () => {
    const { atividadeMaisRecente } = await import ('./Controller.js');
    const visto = d ('2026-01-10');
    const orientacao = (extra) => ({ situacao: 'confirmado', ultimaVisualizacaoProfessor: visto, fases: [], registro: [], ...extra });
    const fase = (extra) => ({ nome: 'Proposta', arquivos: [], comentarios: [], atividades: [], ...extra });
    const novidade = (o) => atividadeMaisRecente (o, 'professor');

    // Gera notificação: ações do aluno depois da última visita.
    assert.equal (novidade (orientacao ({ fases: [fase ({ comentarios: [{ autor: 'aluno', texto: 'oi', data: d ('2026-01-11') }] })] })).detalhe.tipo, 'comentario');
    assert.equal (novidade (orientacao ({ fases: [fase ({ arquivos: [{ originalname: 'a.pdf', dataEnvio: d ('2026-01-11') }] })] })).detalhe.tipo, 'arquivo');
    assert.equal (novidade (orientacao ({ registro: [{ data: d ('2026-01-11'), texto: '{aluno} definiu o tema do TCC: "App de TCC"' }] })).detalhe.texto, 'O aluno definiu o tema do TCC: "App de TCC"');
    assert.equal (novidade (orientacao ({ fases: [fase ({ atividades: [{ titulo: 'T', tipo: 'arquivo', arquivos: [{ dataEnvio: d ('2026-01-11') }] }] })] })).detalhe.tipo, 'atividade-entrega');
    assert.equal (novidade (orientacao ({ registro: [{ data: d ('2026-01-11'), texto: '{aluno} retirou a solicitação de cancelamento' }] })).detalhe.texto, 'O aluno retirou a solicitação de cancelamento');
    assert.equal (novidade (orientacao ({ situacao: 'cancelado', encerradoEm: d ('2026-01-11') })).detalhe.texto, 'O aluno retirou o pedido de orientação.');
    assert.equal (novidade (orientacao ({ situacao: 'cancelado', resposta: 'Cancelado automaticamente: x', encerradoEm: d ('2026-01-11') })).detalhe.texto, 'Pedido cancelado: o aluno foi aceito por outro professor.');

    // Conta cada novidade.
    const varias = novidade (orientacao ({ fases: [fase ({
        comentarios: [{ autor: 'aluno', data: d ('2026-01-11') }, { autor: 'aluno', data: d ('2026-01-12') }],
        arquivos: [{ originalname: 'a.pdf', dataEnvio: d ('2026-01-09') }],
    })] }));
    assert.equal (varias.naoLidas, 2, 'o arquivo antigo (antes da visita) não conta');
    assert.equal (varias.lida, false);

    // Não gera notificação: ações do próprio professor ou já vistas.
    const proprias = novidade (orientacao ({
        fases: [fase ({ comentarios: [{ autor: 'professor', data: d ('2026-01-11') }], aprovadaEm: d ('2026-01-11'), prazoAlteradoEm: d ('2026-01-11'),
            atividades: [{ titulo: 'T', tipo: 'texto', criadaEm: d ('2026-01-11') }] })],
        registro: [{ data: d ('2026-01-11'), texto: '{professor} marcou uma reunião' }],
    }));
    assert.equal (proprias, null);
    assert.equal (novidade (orientacao ({ fases: [fase ({ comentarios: [{ autor: 'aluno', data: d ('2026-01-09') }] })] })).lida, true);
    assert.equal (novidade (orientacao ({ situacao: 'concluido', encerradoEm: d ('2026-01-11') })), null, 'conclusão foi o próprio professor');
});

test ('aluno é avisado quando a orientação é encerrada pelo professor', async () => {
    const { atividadeMaisRecente } = await import ('./Controller.js');
    const o = (extra) => ({ ultimaVisualizacaoAluno: d ('2026-01-10'), encerradoEm: d ('2026-01-11'), fases: [], registro: [], ...extra });
    assert.equal (atividadeMaisRecente (o ({ situacao: 'negado' }), 'aluno').detalhe.texto, 'O orientador recusou seu pedido de orientação.');
    assert.equal (atividadeMaisRecente (o ({ situacao: 'concluido' }), 'aluno').detalhe.texto, 'O orientador concluiu sua orientação. Parabéns! 🎓');
    assert.equal (atividadeMaisRecente (o ({ situacao: 'cancelado', cancelamento: { solicitadoPor: 'professor', data: d ('2026-01-11') } }), 'aluno').detalhe.texto, 'O orientador cancelou a orientação.');
    assert.equal (atividadeMaisRecente (o ({ situacao: 'cancelado' }), 'aluno'), null, 'o próprio aluno retirou o pedido');
});

test ('prazos suspensos durante o pedido de cancelamento são adiados ao retomar', async () => {
    const { retomarPrazos } = await import ('./CancelamentoController.js');
    const o = {
        cancelamento: { solicitadoPor: 'aluno', data: d ('2026-03-10T15:00Z') },
        registro: [],
        fases: [
            { nome: 'Proposta', situacao: 'aprovada', prazo: d ('2026-03-20'), atividades: [] },
            { nome: 'Desenvolvimento', situacao: 'pendente', prazo: d ('2026-03-10'), lembretePrazoEnviado: true, atividades: [
                { titulo: 'aberta', concluida: false, prazo: d ('2026-03-15') },
                { titulo: 'entregue', concluida: true, prazo: d ('2026-03-15') },
                { titulo: 'já vencida', concluida: false, prazo: d ('2026-03-01') },
            ] },
        ],
    };
    const dias = retomarPrazos (o, d ('2026-03-14T09:00Z'));
    assert.equal (dias, 4);
    assert.equal (o.fases[0].prazo.toISOString ().slice (0, 10), '2026-03-20', 'fase aprovada não muda');
    assert.equal (o.fases[1].prazo.toISOString ().slice (0, 10), '2026-03-14', 'prazo do mesmo dia do pedido ainda estava aberto');
    assert.equal (o.fases[1].lembretePrazoEnviado, false);
    const [aberta, entregue, vencida] = o.fases[1].atividades;
    assert.equal (aberta.prazo.toISOString ().slice (0, 10), '2026-03-19');
    assert.equal (entregue.prazo.toISOString ().slice (0, 10), '2026-03-15');
    assert.equal (vencida.prazo.toISOString ().slice (0, 10), '2026-03-01');
    assert.match (o.registro[0].texto, /adiados em 4 dias/);
});
