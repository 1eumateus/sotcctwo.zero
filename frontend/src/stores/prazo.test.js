// node --test src/stores/prazo.test.js
import test from 'node:test';
import assert from 'node:assert';
import { infoPrazo, prazoVencido, estadoOrientacao } from './prazo.js';

const agora = Date.parse ('2026-03-10T12:00:00Z');
const prazo = '2026-03-12T00:00:00Z';

test ('orientação ativa: o tempo corre', () => {
    assert.equal (infoPrazo (prazo, { agora }).texto, 'Restam 2 dias (12/03/2026)');
    assert.equal (infoPrazo ('2026-03-10T00:00:00Z', { agora }).texto, '11:59:59');
    assert.equal (infoPrazo ('2026-03-10T00:00:00Z', { agora }).contagem, true);
    assert.equal (prazoVencido ('2026-03-09T00:00:00Z', { agora }), true);
    assert.equal (prazoVencido ('2026-03-10T00:00:00Z', { agora }), false, 'vale até o fim do dia');
});

test ('pedido de cancelamento: prazo congelado, sem contagem e sem atraso', () => {
    const opcoes = { agora, estado: 'suspensa' };
    assert.equal (infoPrazo (prazo, opcoes).texto, '12/03/2026 · suspenso');
    assert.equal (infoPrazo ('2026-03-10T00:00:00Z', opcoes).contagem, undefined);
    assert.equal (prazoVencido ('2026-03-01T00:00:00Z', opcoes), false);
    // O texto não muda com o passar do tempo.
    assert.deepEqual (infoPrazo (prazo, opcoes), infoPrazo (prazo, { ...opcoes, agora: agora + 5 * 24 * 3600 * 1000 }));
});

test ('orientação cancelada ou concluída: prazo parado para sempre', () => {
    const opcoes = { agora, estado: 'encerrada' };
    assert.equal (infoPrazo (prazo, opcoes).texto, '12/03/2026');
    assert.equal (prazoVencido ('2026-03-01T00:00:00Z', opcoes), false);
    assert.deepEqual (infoPrazo (prazo, opcoes), infoPrazo (prazo, { ...opcoes, agora: agora + 30 * 24 * 3600 * 1000 }));
});

test ('fase aprovada ou atividade entregue mostram só a data', () => {
    assert.equal (infoPrazo (prazo, { agora, resolvido: true }).texto, '12/03/2026');
    assert.equal (infoPrazo (null, { agora }), null);
});

test ('estado da orientação', () => {
    assert.equal (estadoOrientacao ({ ativo: true, situacao: 'confirmado' }), 'ativa');
    assert.equal (estadoOrientacao ({ ativo: true, situacao: 'confirmado', cancelamento: { solicitadoPor: 'aluno', resposta: {} } }), 'suspensa');
    assert.equal (estadoOrientacao ({ ativo: true, situacao: 'confirmado', cancelamento: { solicitadoPor: 'aluno', resposta: { aceito: false, data: '2026-03-01' } } }), 'ativa', 'pedido recusado: volta a correr');
    assert.equal (estadoOrientacao ({ ativo: false, situacao: 'cancelado' }), 'encerrada');
    assert.equal (estadoOrientacao ({ ativo: false, situacao: 'concluido' }), 'encerrada');
});
