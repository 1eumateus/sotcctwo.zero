<template>
    <RespostaOrientacao
        @modal:open="recarregar($event)"
        :orientacao="orientacao"
        :situacao="situacao"
        :usuario="props?.usuario"
        v-if="openRespostaOrientacao"
    />
    <div class="grid grid-cols-1 gap-[8px]">
        <section class="grid grid-cols-1 gap-[10px] border border-secundaria-opaco rounded-md bg-white p-[14px]" >
            <div class="flex items-center justify-between gap-[8px] border-b border-secundaria-opaco pb-[8px]">
                <div class="flex items-center gap-[8px]">
                    <PhUsersThree :size="22" class="fill-principal" />
                    <Texto as="h4" color="principal">
                        {{ mostrarHistorico ? 'Histórico' : 'Orientações' }}
                    </Texto>
                </div>
                <button type="button" class="cursor-pointer text-[13px] font-bold text-principal hover:underline" @click="toggleHistorico">
                    {{ mostrarHistorico ? 'Ver ativas' : 'Ver histórico' }}
                </button>
            </div>
            <div class="flex flex-col gap-[8px]" v-if="!mostrarHistorico && props?.usuario?.tipo === 'aluno'">
                <div v-if="linhasExibidas.length === 0" class="flex flex-col items-center gap-[6px] py-[24px]">
                    <PhUsersThree :size="32" class="fill-secundaria-opaco" />
                    <Texto as="body" color="gray">
                        Nenhuma solicitação de orientação ainda.
                    </Texto>
                </div>
                <div class="flex gap-[12px] overflow-x-auto pb-[6px]" v-else>
                    <div
                        v-for="item in linhasExibidas"
                        :key="item._id"
                        class="relative flex-shrink-0 w-[250px] flex flex-col gap-[8px] bg-white border border-secundaria-opaco rounded-md p-[12px] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <span :class="`absolute left-0 top-[10px] bottom-[10px] w-[3px] rounded-r-[3px] ${situacaoBadgeClass(item.situacao)}`"></span>
                        <div class="flex items-center gap-[8px] pl-[8px]">
                            <img
                                v-if="item.professor?.imagem?.filename"
                                :src="`${urlApi}/uploads/${item.professor.imagem.filename}`"
                                :alt="item.professor.imagem.originalname"
                                class="h-[32px] w-[32px] object-cover rounded-full border border-secundaria-opaco flex-shrink-0"
                            />
                            <img
                                v-else
                                :src="`/ui/Sem_imagem.jpg`"
                                :alt="'sem imagem'"
                                class="h-[32px] w-[32px] object-cover rounded-full border border-secundaria-opaco flex-shrink-0"
                            />
                            <div class="min-w-0 flex-1">
                                <Texto as="label" class="truncate font-bold">{{ item.professor?.nome }} {{ item.professor?.sobrenome }}</Texto>
                                <Texto as="small" color="gray" class="normal-case font-normal truncate">
                                    {{ item.tema?.trim() || item.temaRascunho?.trim() || 'orientador(a)' }}
                                </Texto>
                            </div>
                            <span
                                v-if="item.situacao !== 'pendente'"
                                :class="`flex-shrink-0 whitespace-nowrap self-start text-[9px] font-bold uppercase tracking-wide px-[7px] py-[2px] rounded-full ${situacaoClass(item.situacao)}`"
                            >
                                {{ situacaoPillLabel(item.situacao) }}
                            </span>
                        </div>
                        <Texto as="label" class="pl-[8px]">
                            {{ mensagemFeed(item.situacao) }}
                        </Texto>
                        <Texto as="small" color="gray" class="pl-[8px] normal-case font-normal">
                            {{ item.dataCriacao ? formatMask.viewDate(item.dataCriacao) : '' }}
                        </Texto>
                        <div class="flex items-center gap-[6px] pl-[8px] mt-auto pt-[2px]">
                            <button
                                type="button"
                                :onClick="()=> cancelarPedido(item)"
                                class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] border border-red-300 text-red-600 hover:bg-red-50 rounded-md font-bold text-[12px]"
                                v-if="item.situacao === 'pendente'"
                            >
                                <PhX :size="14" />
                                Cancelar pedido
                            </button>
                            <router-link
                                :to="`/ui/acompanhamento/${item._id}`"
                                class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] bg-terciaria text-white hover:bg-terciaria-opaco rounded-md font-bold text-[12px]"
                                v-if="item.situacao === 'confirmado'"
                            >
                                <PhChartLineUp :size="14" />
                                Acompanhar
                                <span v-if="item.notificacao" class="w-[7px] h-[7px] rounded-full bg-red-500 border border-white"></span>
                            </router-link>
                            <router-link
                                :to="`/ui/acompanhamento/${item._id}`"
                                v-if="item.situacao === 'confirmado' && item.cancelamento?.solicitadoPor === 'aluno' && !item.cancelamento?.resposta?.data"
                                class="cursor-pointer text-[11px] font-bold px-[10px] py-[6px] rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200"
                            >
                                Cancelamento solicitado
                            </router-link>
                            <button
                                type="button"
                                :onClick="()=> cancelarPedido(item)"
                                class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] border border-red-300 text-red-600 hover:bg-red-50 rounded-md font-bold text-[12px]"
                                v-else-if="item.situacao === 'confirmado' && item.podeSolicitarCancelamento"
                            >
                                <PhX :size="14" />
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex flex-col gap-[8px]" v-else-if="!mostrarHistorico && props?.usuario?.tipo === 'professor'">
                <div v-if="linhasExibidas.length === 0" class="flex flex-col items-center gap-[6px] py-[24px]">
                    <PhUsersThree :size="32" class="fill-secundaria-opaco" />
                    <Texto as="body" color="gray">
                        Nenhum pedido de orientação pendente.
                    </Texto>
                </div>
                <div class="flex gap-[12px] overflow-x-auto pb-[6px]">
                    <div
                        v-for="(item, index) in linhasExibidas"
                        :key="item._id"
                        class="relative flex-shrink-0 w-[250px] flex flex-col gap-[8px] bg-white border border-secundaria-opaco rounded-md p-[12px] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <span class="absolute left-0 top-[10px] bottom-[10px] w-[3px] rounded-r-[3px] bg-orange-500"></span>
                        <div class="flex items-center gap-[8px] pl-[8px]">
                            <img
                                v-if="item.aluno?.imagem?.filename"
                                :src="`${urlApi}/uploads/${item.aluno.imagem.filename}`"
                                :alt="item.aluno.imagem.originalname"
                                class="h-[32px] w-[32px] object-cover rounded-full border border-secundaria-opaco flex-shrink-0"
                            />
                            <img
                                v-else
                                :src="`/ui/Sem_imagem.jpg`"
                                :alt="'sem imagem'"
                                class="h-[32px] w-[32px] object-cover rounded-full border border-secundaria-opaco flex-shrink-0"
                            />
                            <div class="min-w-0 flex-1">
                                <Texto as="label" class="truncate font-bold">{{ item.aluno?.nome }} {{ item.aluno?.sobrenome }}</Texto>
                                <Texto as="small" color="gray" class="normal-case font-normal">quer sua orientação</Texto>
                            </div>
                            <span
                                v-if="index === 0"
                                title="Aguardando resposta há mais tempo"
                                class="flex-shrink-0 flex items-center gap-[3px] text-[9px] font-bold uppercase tracking-wide px-[7px] py-[2px] rounded-full bg-orange-100 text-orange-700"
                            >
                                <PhClock :size="10" class="fill-orange-700" />
                                +antigo
                            </span>
                        </div>
                        <Texto as="label" class="pl-[8px] line-clamp-2 italic">
                            "{{ item.proposta?.trim() || 'Sem proposta escrita.' }}"
                        </Texto>
                        <Texto as="small" color="gray" class="pl-[8px] normal-case font-normal">
                            {{ item.dataCriacao ? formatMask.viewDate(item.dataCriacao) : '' }}
                        </Texto>
                        <div class="flex items-center gap-[6px] pl-[8px] mt-auto pt-[2px]">
                            <router-link
                                :to="`/ui/orientacao/${item._id}`"
                                class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] border border-principal text-principal hover:bg-secundaria rounded-md font-bold text-[12px]"
                            >
                                <PhInfo :size="14" />
                                Detalhes
                            </router-link>
                            <button
                                type="button"
                                :onClick="()=> responderOrientacao(item, 'confirmado')"
                                class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] bg-green-600 hover:bg-green-700 text-white rounded-md font-bold text-[12px]"
                            >
                                <PhCheck :size="14" />
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex flex-col gap-[14px]" v-else-if="mostrarHistorico">
                <div v-if="historicoExibido.length === 0" class="flex flex-col items-center gap-[6px] py-[24px]">
                    <PhClockCounterClockwise :size="32" class="fill-secundaria-opaco" />
                    <Texto as="body" color="gray">
                        {{ filtroExterno === 'concluido' ? 'Nenhuma orientação concluída ainda.' : 'Nenhuma orientação no histórico ainda.' }}
                    </Texto>
                </div>
                <section
                    v-for="secao in secoesHistorico"
                    :key="secao.chave"
                    :class="secao.caixa
                        ? 'rounded-xl border border-secundaria-opaco bg-secundaria/50 p-[10px]'
                        : ''"
                >
                    <div class="flex items-center gap-[8px] mb-[6px] px-[4px]">
                        <span v-if="!secao.caixa" class="relative flex w-[10px] h-[10px]">
                            <span class="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping"></span>
                            <span class="relative inline-flex w-[10px] h-[10px] rounded-full bg-green-500"></span>
                        </span>
                        <PhArchive v-else :size="18" class="fill-gray-500" />
                        <Texto as="body-bold" :color="secao.caixa ? 'gray' : 'principal'">{{ secao.titulo }}</Texto>
                        <span class="text-[11px] font-bold px-[8px] py-[1px] rounded-full bg-white border border-secundaria-opaco text-gray-600">
                            {{ secao.grupos.length }}
                        </span>
                    </div>
                    <div :class="secao.caixa ? 'flex flex-col gap-[6px]' : 'flex flex-col'">
                        <details
                            v-for="grupo in secao.grupos"
                            :key="grupo.id"
                            :class="`group rounded-lg transition-colors ${secao.caixa ? 'bg-white border border-secundaria-opaco' : 'border-b border-secundaria last:border-b-0'}`"
                        >
                            <summary class="flex items-center gap-[10px] py-[10px] px-[8px] cursor-pointer list-none rounded-lg hover:bg-secundaria/40">
                                <img
                                    v-if="grupo.pessoa?.imagem?.filename"
                                    :src="`${urlApi}/uploads/${grupo.pessoa.imagem.filename}`"
                                    alt=""
                                    class="w-[36px] h-[36px] rounded-full object-cover flex-shrink-0"
                                />
                                <span
                                    v-else
                                    :class="`w-[36px] h-[36px] rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-white ${secao.caixa ? 'bg-gray-400' : 'bg-principal'}`"
                                >
                                    {{ iniciais(grupo.pessoa) }}
                                </span>
                                <div class="flex-1 min-w-0">
                                    <Texto as="body-bold" class="truncate">
                                        {{ nomeCompleto(grupo.pessoa) }}
                                    </Texto>
                                    <Texto as="small" color="gray" class="truncate block" v-if="grupo.itens[0].eventos?.length">
                                        {{ dataHora(grupo.itens[0].eventos[0].data) }} · {{ grupo.itens[0].eventos[0].texto }}
                                    </Texto>
                                </div>
                                <span :class="`text-xs font-bold px-[10px] py-[3px] rounded-full flex-shrink-0 ${situacaoClass(grupo.itens[0].situacao)}`">
                                    {{ situacaoLabel(grupo.itens[0].situacao) }}
                                </span>
                                <PhCaretRight :size="16" class="fill-principal flex-shrink-0 transition-transform group-open:rotate-90" />
                            </summary>
                            <div class="pb-[12px] px-[12px] flex flex-col gap-[14px]">
                                <template v-for="(item, indice) in grupo.itens" :key="item._id">
                                    <div v-if="indice === 0 || antigasAbertas[grupo.id]">
                                        <div class="flex items-center justify-between gap-[8px] mb-[8px]">
                                            <Texto as="small" color="gray">
                                                {{ indice > 0 ? 'Orientação anterior' : item.ativo ? 'Orientação em andamento' : 'Orientação mais recente' }} · {{ historicoResumo(item) }}
                                            </Texto>
                                            <router-link
                                                :to="`/ui/acompanhamento/${item._id}`"
                                                class="cursor-pointer flex items-center gap-[4px] px-[8px] py-[4px] border border-principal text-principal hover:bg-secundaria rounded-md font-bold text-[12px] flex-shrink-0"
                                            >
                                                <PhInfo :size="14" />
                                                Ver detalhes
                                            </router-link>
                                        </div>
                                        <ol class="relative ml-[6px] border-l-2 border-secundaria-opaco flex flex-col gap-[8px]">
                                            <li v-for="(evento, i) in item.eventos" :key="i" class="relative pl-[14px]">
                                                <span
                                                    :class="`absolute -left-[6px] top-[4px] w-[10px] h-[10px] rounded-full border-2 border-white ${i === 0 && item.ativo ? 'bg-terciaria' : 'bg-principal/60'}`"
                                                ></span>
                                                <Texto as="small" color="gray" class="block">{{ dataHora(evento.data) }}</Texto>
                                                <span class="text-[13px] text-gray-800">{{ evento.texto }}</span>
                                            </li>
                                        </ol>
                                    </div>
                                </template>
                                <button
                                    v-if="grupo.itens.length > 1"
                                    type="button"
                                    class="self-start cursor-pointer flex items-center gap-[4px] text-[12px] font-bold text-principal hover:underline"
                                    @click="antigasAbertas[grupo.id] = !antigasAbertas[grupo.id]"
                                >
                                    <PhClockCounterClockwise :size="14" />
                                    {{ antigasAbertas[grupo.id] ? 'Ocultar orientações anteriores' : `Ver orientações anteriores (${grupo.itens.length - 1})` }}
                                </button>
                            </div>
                        </details>
                    </div>
                </section>
            </div>
            <div class="overflow-x-auto" v-else>
                <table v-if="linhasExibidas.length>0" class="min-w-full text-sm">
                    <thead>
                        <tr class="bg-secundaria-opaco font-bold border-b border-secundaria-opaco">
                            <td class="p-[10px] text-left" v-if="props?.usuario.tipo !== 'professor'">
                                Orientador
                            </td>
                            <td class="p-[10px] text-left" v-if="props?.usuario.tipo !== 'aluno'">
                                Aluno
                            </td>
                            <td class="p-[10px]">
                                Situação
                            </td>
                            <td class="p-[10px] text-left">
                                Proposta
                            </td>
                            <td class="p-[10px] text-left" v-if="props?.usuario.tipo !== 'admin'">
                                Resposta do orientador
                            </td>
                            <td class="p-[10px] min-w-40">
                                Data e hora de defesa
                            </td>
                            <td class="p-[10px]">
                                Opções
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(orientacao, index) in linhasExibidas" :key="index" class="even:bg-secundaria hover:bg-secundaria-opaco/40 border-b border-secundaria transition-colors" >
                            <td class="p-[10px] text-left min-w-40" v-if="props?.usuario.tipo !== 'professor'">
                                {{ orientacao?.professor?.nome }} {{ orientacao?.professor?.sobrenome }}
                            </td>
                            <td class="p-[10px] text-left min-w-40" v-if="props?.usuario.tipo !== 'aluno'">
                                {{ orientacao.aluno.nome }} {{ orientacao.aluno.sobrenome }}
                            </td>
                            <td class="p-[10px]">
                                <span :class="`text-xs font-bold px-[10px] py-[3px] rounded-full ${situacaoClass(orientacao.situacao)}`">
                                    {{ orientacao.situacao }}
                                </span>
                            </td>
                            <td class="p-[10px] text-left min-w-40">
                                {{ orientacao.proposta || ' - ' }}
                            </td>
                            <td class="p-[10px] text-left min-w-40" v-if="props?.usuario.tipo !== 'admin'">
                                {{ orientacao.resposta || ' - ' }}
                            </td>
                            <td class="p-[10px]">
                                {{ orientacao.dataDefesa ? formatMask.viewDate(orientacao.dataDefesa) : '-'}}
                                {{ orientacao.horaDefesa ? orientacao.horaDefesa : ' : -'}}
                            </td>
                            <td class="p-[10px]">
                                <div class="flex flex-col gap-[6px] min-w-[170px]">
                                    <button
                                        type="button"
                                        :onClick="()=> responderOrientacao(orientacao, 'confirmado')"
                                        v-if="props.usuario.tipo === 'professor' && orientacao.situacao !== 'confirmado'"
                                        class="cursor-pointer w-full flex items-center justify-center gap-[6px] px-[10px] py-[6px] border border-green-400 text-green-700 hover:bg-green-50 rounded-md font-bold text-[13px]"
                                    >
                                        <PhCheck :size="16" />
                                        Confirmar orientação
                                    </button>
                                    <router-link
                                        :to="`/ui/orientacao/${orientacao._id}`"
                                        class="cursor-pointer w-full flex items-center justify-center gap-[6px] px-[10px] py-[6px] bg-principal text-white hover:bg-principal-opaco rounded-md font-bold text-[13px]"
                                        v-if="orientacao.situacao === 'confirmado' && props.usuario.tipo !== 'aluno'"
                                    >
                                        <PhInfo :size="16" />
                                        Detalhes da proposta
                                    </router-link>
                                    <router-link
                                        :to="`/ui/acompanhamento/${orientacao._id}`"
                                        class="cursor-pointer w-full flex items-center justify-center gap-[6px] px-[10px] py-[6px] bg-terciaria text-white hover:bg-terciaria-opaco rounded-md font-bold text-[13px]"
                                        v-if="orientacao.situacao === 'confirmado'"
                                    >
                                        <PhChartLineUp :size="16" />
                                        Acompanhar
                                        <span v-if="orientacao.notificacao" class="w-[8px] h-[8px] rounded-full bg-red-500 border border-white"></span>
                                    </router-link>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <Texto as="body" color="gray" v-else>
                    Nenhum pedido de orientação.
                </Texto>
            </div>
        </section>
    </div>
</template>

<script setup>
import { PhUsersThree, PhCheck, PhInfo, PhChartLineUp, PhClock, PhX, PhArchive, PhCaretRight, PhClockCounterClockwise } from '@phosphor-icons/vue'
import Texto from '@components/Texto.vue'
import { computed, onMounted, reactive, ref, watch } from "vue";
import api from "@/api.js";
import { popupInfo, formatMask } from '../../stores/util.js';
import RespostaOrientacao from './RespostaOrientacao.vue';

const urlApi = import.meta.env.VITE_URL;

const situacao = ref ("");
const orientacoes = reactive ([]);
const orientacao = reactive ({});
const openRespostaOrientacao = ref (false);

const props = defineProps({
    usuario: {
        type: [Object],
        required: false,
    },
    filtroExterno: {
        type: String,
        default: null,
    },
});

const emits = defineEmits(['atualizado', 'historico', 'filtroManual']);

function mensagemFeed (situacao) {
    if (situacao === 'pendente') return 'ainda não respondeu sua solicitação de orientação.';
    if (situacao === 'confirmado') return 'confirmou sua orientação! 🎉';
    if (situacao === 'concluido') return 'concluiu a orientação com você.';
    if (situacao === 'cancelado') return 'teve a orientação cancelada.';
    return 'recusou sua solicitação de orientação.';
}

function situacaoBadgeClass (situacao) {
    if (situacao === 'confirmado') return 'bg-green-500';
    if (situacao === 'pendente') return 'bg-orange-500';
    if (situacao === 'concluido') return 'bg-principal';
    return 'bg-red-500';
}

function situacaoPillLabel (situacao) {
    if (situacao === 'confirmado') return 'Confirmado';
    if (situacao === 'pendente') return 'Solicitação enviada';
    if (situacao === 'concluido') return 'Concluído';
    if (situacao === 'negado') return 'Negado';
    return 'Cancelado';
}

function outraPessoa (item) {
    return props.usuario?.tipo === 'aluno' ? item.professor : item.aluno;
}

function nomeCompleto (pessoa) {
    return `${pessoa?.nome || ''} ${pessoa?.sobrenome || ''}`.trim() || 'Usuário removido';
}

function situacaoLabel (situacao) {
    if (situacao === 'confirmado') return 'Em andamento';
    if (situacao === 'concluido') return 'Concluída';
    if (situacao === 'cancelado') return 'Cancelada';
    if (situacao === 'negado') return 'Negada';
    return 'Encerrada';
}

function historicoResumo (item) {
    if (item.situacao === 'concluido') {
        return item.tema?.trim() ? `Tema: ${item.tema}` : 'Orientação concluída.';
    }
    if (item.situacao === 'cancelado') {
        const motivo = item.cancelamento?.resposta?.motivo || item.cancelamento?.motivo || item.resposta;
        return motivo ? `Cancelada. Motivo: ${motivo}` : 'Cancelada.';
    }
    if (item.situacao === 'negado') {
        return item.resposta ? `Solicitação negada. Motivo: ${item.resposta}` : 'Solicitação negada.';
    }
    if (item.situacao === 'confirmado') return 'Em andamento.';
    return 'Orientação encerrada.';
}

function dataHora (data) {
    return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const mostrarHistorico = ref (false);
watch (mostrarHistorico, (valor) => emits ('historico', valor), { immediate: true });
const historicoItens = reactive ([]);

const linhasExibidas = computed(() => {
    if (props.usuario?.tipo === 'professor') {
        return orientacoes
            .filter((item) => item.situacao === 'pendente')
            .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao));
    }
    if (props.filtroExterno === 'confirmado') {
        return orientacoes.filter((item) => item.situacao === 'confirmado');
    }
    if (props.filtroExterno === 'todas') {
        return [...orientacoes, ...historicoItens.filter((item) => !item.ativo && item.situacao !== 'concluido')]
            .sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
    }
    return orientacoes;
});

const historicoExibido = computed(() => (
    props.filtroExterno === 'concluido'
        ? historicoItens.filter((item) => item.situacao === 'concluido')
        : historicoItens
));

const antigasAbertas = reactive({});

// Um grupo por pessoa (pelo _id, não pelo nome), em ordem alfabética.
// Em andamento em cima; quem só tem orientações encerradas vai para a caixa de baixo.
const secoesHistorico = computed(() => {
    const grupos = new Map();
    for (const item of historicoExibido.value) {
        const pessoa = outraPessoa(item);
        const id = pessoa?._id || item._id;
        if (!grupos.has(id)) grupos.set(id, { id, pessoa, itens: [] });
        grupos.get(id).itens.push(item);
    }
    const lista = [...grupos.values()];
    for (const grupo of lista) {
        // A orientação em andamento vem primeiro; as encerradas ficam em "anteriores".
        grupo.itens.sort((a, b) => (b.ativo - a.ativo) || new Date(b.dataCriacao) - new Date(a.dataCriacao));
    }
    lista.sort((a, b) => nomeCompleto(a.pessoa).localeCompare(nomeCompleto(b.pessoa), 'pt-BR', { sensitivity: 'base' }));
    return [
        { chave: 'andamento', titulo: 'Em andamento', caixa: false, grupos: lista.filter((g) => g.itens[0].ativo) },
        { chave: 'encerradas', titulo: 'Concluídas e canceladas', caixa: true, grupos: lista.filter((g) => !g.itens[0].ativo) },
    ].filter((secao) => secao.grupos.length);
});

function iniciais (pessoa) {
    return `${pessoa?.nome?.[0] || ''}${pessoa?.sobrenome?.[0] || ''}`.toUpperCase() || '?';
}

function situacaoClass (situacao) {
    if (situacao === 'confirmado') return 'bg-green-100 text-green-700';
    if (situacao === 'pendente') return 'bg-orange-100 text-orange-700';
    if (situacao === 'concluido') return 'bg-secundaria-opaco text-principal';
    return 'bg-red-100 text-red-700';
}

async function recarregar (event){
    openRespostaOrientacao.value = event
    await listarOrientacao ()
    emits ('atualizado')
    window.dispatchEvent(new Event('sotcc:notificacao-vista'));
}

async function listarOrientacao () {
    orientacoes.splice (0, orientacoes.length);
    await api.get (`/orientacao/`)
        .then ((res) => {
            Object.assign (orientacoes, res.data?.item);
        }).catch ((e) => {
            popupInfo ().warning (e?.response?.data?.msg || e);
        })
}

async function listarHistorico () {
    historicoItens.splice (0, historicoItens.length);
    await api.get (`/orientacao/historico`)
        .then ((res) => {
            Object.assign (historicoItens, res.data?.item);
        }).catch ((e) => {
            popupInfo ().warning (e?.response?.data?.msg || e);
        })
}

async function toggleHistorico () {
    mostrarHistorico.value = !mostrarHistorico.value;
    emits ('filtroManual');
    if (mostrarHistorico.value && historicoItens.length === 0) {
        await listarHistorico ();
    }
}

watch (() => props.filtroExterno, async (valor) => {
    mostrarHistorico.value = valor === 'concluido';
    if ((valor === 'concluido' || valor === 'todas') && historicoItens.length === 0) {
        await listarHistorico ();
    }
}, { immediate: true });

async function cancelarPedido (orientacaoParaCancelar) {
    openRespostaOrientacao.value = true;
    Object.assign(orientacao, orientacaoParaCancelar)
}

async function responderOrientacao (orientacaoParaNegar, novaSituacao) {
    openRespostaOrientacao.value = true;
    situacao.value = novaSituacao;
    Object.assign (orientacao, orientacaoParaNegar)
}

onMounted (async () => {
    await listarOrientacao ();
});

defineExpose ({ listarOrientacao });
</script>
