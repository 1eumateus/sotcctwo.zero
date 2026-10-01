// Regra única de exibição de prazos (fase e atividade).
// Teste: node --test src/stores/prazo.test.js

const DIA = 24 * 60 * 60 * 1000;

function dataCurta (valor) {
    const d = new Date (valor);
    return `${String (d.getUTCDate ()).padStart (2, '0')}/${String (d.getUTCMonth () + 1).padStart (2, '0')}/${d.getUTCFullYear ()}`;
}

// Prazo guarda só o dia (meia-noite UTC); vale até o fim desse dia.
function fimDoDia (valor) {
    const d = new Date (valor);
    return Date.UTC (d.getUTCFullYear (), d.getUTCMonth (), d.getUTCDate (), 23, 59, 59, 999);
}

// estado da orientação: 'ativa' | 'suspensa' (cancelamento pedido) | 'encerrada' (cancelada/concluída)
// O tempo só corre em 'ativa'.
function infoPrazo (prazo, { resolvido = false, estado = 'ativa', agora = Date.now () } = {}) {
    if (!prazo) return null;
    const data = dataCurta (prazo);
    if (resolvido) return { texto: data, classe: 'bg-secundaria text-gray-600' };
    if (estado === 'encerrada') return { texto: data, classe: 'bg-gray-200 text-gray-500' };
    if (estado === 'suspensa') return { texto: `${data} · suspenso`, classe: 'bg-gray-200 text-gray-500 line-through decoration-gray-400' };
    const restanteMs = fimDoDia (prazo) - agora;
    if (restanteMs <= 0) return { texto: data, classe: 'bg-red-600 text-white', vencido: true };
    if (restanteMs <= DIA) {
        const seg = Math.floor (restanteMs / 1000);
        const h = String (Math.floor (seg / 3600)).padStart (2, '0');
        const m = String (Math.floor ((seg % 3600) / 60)).padStart (2, '0');
        const s = String (seg % 60).padStart (2, '0');
        return { texto: `${h}:${m}:${s}`, classe: 'bg-red-100 text-red-700', contagem: true };
    }
    const hoje = new Date (agora);
    const dias = Math.round ((fimDoDia (prazo) - fimDoDia (Date.UTC (hoje.getUTCFullYear (), hoje.getUTCMonth (), hoje.getUTCDate ()))) / DIA);
    const texto = `Restam ${dias} dia${dias === 1 ? '' : 's'} (${data})`;
    if (restanteMs <= 3 * DIA) return { texto, classe: 'bg-orange-100 text-orange-700' };
    return { texto, classe: 'bg-secundaria text-gray-600' };
}

function prazoVencido (prazo, opcoes = {}) {
    return !!infoPrazo (prazo, opcoes)?.vencido;
}

function estadoOrientacao (orientacao) {
    if (orientacao?.ativo === false || ['cancelado', 'concluido'].includes (orientacao?.situacao)) return 'encerrada';
    if (orientacao?.cancelamento?.solicitadoPor && !orientacao?.cancelamento?.resposta?.data) return 'suspensa';
    return 'ativa';
}

export { infoPrazo, prazoVencido, estadoOrientacao };
