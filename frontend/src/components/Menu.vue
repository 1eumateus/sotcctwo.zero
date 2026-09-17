<template>
    <nav class="flex items-center justify-between px-[5px] md:px-[80px] lg:px-[80px] border-b-[2px] border-terciaria gap-[24px] bg-principal text-white">
       <section class="flex items-center gap-[24px] ">
            <router-link to="/ui/" class=" hover:text-terciaria hidden md:block lg:block">
                <Texto as="h3" color="white" :cursorPointer="true">
                    SOTCC 
                </Texto>
                <Texto as="h3" color="white" :cursorPointer="true">
                    - Sistema de orientação em TCC
                </Texto>
            </router-link> 

            <router-link to="/ui/" class=" hover:text-terciaria block md:hidden lg:hidden">
                <Texto as="body-bold" color="white" :cursorPointer="true">
                    SOTCC
                </Texto>
                <Texto as="body-bold" color="white" :cursorPointer="true">
                    - Sistema de orientação em TCC
                </Texto>
            </router-link>
        </section>

        <section class="flex items-center gap-[16px]">
            <dropdown-menu mode="click" :overlay="false" v-if="user.tipo !== 'admin'">
                <template #trigger>
                    <div class="cursor-pointer p-[8px] rounded-full hover:bg-principal-opaco transition-colors relative flex items-center justify-center">
                        <PhBell :size="26" />
                        <span
                            v-if="naoLidasCount > 0"
                            class="absolute top-[2px] right-[2px] min-w-[16px] h-[16px] px-[3px] flex items-center justify-center rounded-full bg-red-500 border border-principal text-white text-[10px] font-bold leading-none"
                        >
                            {{ naoLidasCount > 9 ? '9+' : naoLidasCount }}
                        </span>
                    </div>
                </template>
                <template #body>
                    <div class="relative">
                        <div class="fixed sm:absolute z-40 top-16 sm:top-4 left-2 right-2 sm:left-auto sm:right-0 sm:w-[280px] max-h-[70vh] overflow-y-auto bg-principal rounded-md border border-terciaria flex flex-col text-left">
                            <div class="flex items-center justify-between gap-[8px] px-[14px] py-[8px] border-b border-terciaria">
                                Notificações
                                <button
                                    v-if="naoLidasCount > 0"
                                    type="button"
                                    class="cursor-pointer text-[11px] font-bold text-terciaria hover:underline"
                                    @click="marcarTodasNotificacoesVistas"
                                >
                                    Marcar todas como lidas
                                </button>
                            </div>
                            <router-link
                                v-for="item in orientacoesComNotificacao"
                                :key="item._id"
                                :to="item.solicitacaoPendente ? '/ui/' : `/ui/acompanhamento/${item._id}`"
                                class="cursor-pointer flex items-center gap-[10px] px-[14px] py-[10px] w-full transition-colors border-l-[3px]"
                                :class="ehNaoLida(item) ? 'bg-terciaria/10 border-terciaria hover:bg-terciaria/20' : 'border-transparent hover:bg-principal-opaco'"
                                @click="marcarItemComoLido(item)"
                            >
                                <div class="cursor-pointer relative flex-shrink-0">
                                    <img
                                        v-if="avatarNotificacao(item)?.filename"
                                        :src="`${urlApi}/uploads/${avatarNotificacao(item).filename}`"
                                        class="w-[36px] h-[36px] rounded-full object-cover border border-terciaria/40"
                                    />
                                    <div v-else class="w-[36px] h-[36px] rounded-full bg-terciaria flex items-center justify-center text-white text-[13px] font-bold">
                                        {{ iniciaisNotificacao(item) }}
                                    </div>
                                    <span
                                        v-if="item.cancelamentoPendente || item.solicitacaoPendente"
                                        title="Ação necessária"
                                        class="absolute -bottom-[3px] -right-[3px] w-[16px] h-[16px] rounded-full bg-orange-500 border-2 border-principal flex items-center justify-center"
                                    >
                                        <PhWarning :size="10" class="fill-white" weight="fill" />
                                    </span>
                                </div>
                                <div class="cursor-pointer flex flex-col gap-[2px] min-w-0 flex-1">
                                    <Texto
                                        :as="ehNaoLida(item) ? 'body-bold' : 'body'"
                                        :color="ehNaoLida(item) ? 'white' : 'gray'"
                                        :class="!ehNaoLida(item) ? '!text-gray-400' : ''"
                                        :cursorPointer="true"
                                    >
                                        {{ user.tipo === 'aluno' ? nomeCompleto(item.professor) : nomeCompleto(item.aluno) }}
                                    </Texto>
                                    <Texto
                                        as="label"
                                        :color="ehNaoLida(item) ? 'white' : 'gray'"
                                        :class="!ehNaoLida(item) ? '!text-gray-400' : ''"
                                        :cursorPointer="true"
                                    >
                                        <template v-if="item.solicitacaoPendente">
                                            Nova solicitação de orientação{{ item.proposta ? `: "${item.proposta}"` : '' }}
                                        </template>
                                        <template v-else-if="item.cancelamentoPendente">
                                            Solicitou cancelamento: "{{ item.cancelamento.motivo }}"
                                        </template>
                                        <template v-else-if="item.cancelamentoAguardando">
                                            Você solicitou cancelamento, aguardando resposta.
                                        </template>
                                        <template v-else>
                                            {{ resumoNotificacao(item.notificacaoDetalhe) }}
                                        </template>
                                    </Texto>
                                    <span class="cursor-pointer text-[10px] font-bold uppercase" :class="ehNaoLida(item) ? 'text-terciaria' : 'text-gray-400'">
                                        {{ tempoRelativo(dataNotificacao(item)) }}
                                    </span>
                                </div>
                                <span v-if="ehNaoLida(item)" class="cursor-pointer w-[9px] h-[9px] rounded-full bg-terciaria flex-shrink-0 self-start mt-[4px]"></span>
                            </router-link>
                            <div v-if="orientacoesComNotificacao.length === 0" class="px-[14px] py-[8px] text-gray-300">
                                Nenhuma novidade.
                            </div>
                        </div>
                    </div>
                </template>
            </dropdown-menu>

        <dropdown-menu mode="click" :overlay="false" >
            <template #trigger >
                <div class="cursor-pointer hover:text-terciaria flex items-center gap-[8px]"> 
                    {{user.nome}} 
                    <PhGear :size="28" />
                </div>
            </template>
            <template #body>
                <div class="relative">
                    <div class="absolute z-40 top-4 right-0 bg-principal rounded-md border border-terciaria flex flex-col text-left">
                        <router-link 
                            to="/ui/perfil" 
                            class="px-[14px] py-[8px] hover:text-terciaria w-full rounded-md" >
                            Perfil
                        </router-link>
                        <router-link 
                            to="/ui/usuarios" 
                            class="px-[14px] py-[8px] hover:text-terciaria w-full rounded-md"
                            v-if="user.tipo === 'admin'"
                            >
                            Usuários 
                        </router-link>
                        <button 
                            type="button" 
                            @click="logout" 
                            class="flex px-[14px] py-[8px] hover:text-terciaria w-full rounded-md" >
                            Sair
                        </button>
                    </div>
                </div>
            </template>
        </dropdown-menu>
        </section>
    </nav>
</template>

<script setup>
import { PhGear, PhBell, PhWarning } from '@phosphor-icons/vue';
import Texto from '@components/Texto.vue'
import dropdownMenu from 'v-dropdown-menu';
import { reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/api.js';
import { formatMask } from '@/stores/util.js';

const props = defineProps(["user"]);
const route = useRoute();
const urlApi = import.meta.env.VITE_URL;

const orientacoesComNotificacao = reactive([]);
const naoLidasCount = computed(() => orientacoesComNotificacao.filter(ehNaoLida).length);

function nomeCompleto(pessoa) {
    return `${pessoa?.nome || ''} ${pessoa?.sobrenome || ''}`.trim();
}

function resumoNotificacao(detalhe) {
    if (!detalhe) return '';
    if (detalhe.tipo === 'arquivo') {
        return `Arquivo novo em "${detalhe.fase}": ${detalhe.texto}`;
    }
    if (detalhe.tipo === 'prazo') {
        return detalhe.texto
            ? `Novo prazo em "${detalhe.fase}": ${formatMask.viewDate(detalhe.texto)}`
            : `O prazo de "${detalhe.fase}" foi removido.`;
    }
    if (detalhe.tipo === 'descricao') {
        return `Descrição atualizada em "${detalhe.fase}".`;
    }
    if (detalhe.tipo === 'aprovacao') {
        return `O orientador aprovou a fase "${detalhe.fase}".`;
    }
    if (detalhe.tipo === 'confirmacao') {
        return 'O orientador aceitou sua solicitação de orientação! 🎉';
    }
    if (detalhe.tipo === 'cancelamento-resposta') {
        return detalhe.texto.aceito
            ? 'Seu pedido de cancelamento foi aceito.'
            : `Seu pedido de cancelamento foi recusado. Motivo: ${detalhe.texto.motivo}`;
    }
    const texto = detalhe.texto.length > 50 ? detalhe.texto.slice(0, 50) + '...' : detalhe.texto;
    return `Comentário em "${detalhe.fase}": "${texto}"`;
}

function ehNaoLida(item) {
    return item.solicitacaoPendente || item.cancelamentoPendente || !item.notificacaoLida;
}

function dataNotificacao(item) {
    if (item.solicitacaoPendente) return item.dataCriacao;
    if (item.cancelamentoPendente || item.cancelamentoAguardando) return item.cancelamento?.data;
    return item.notificacaoDetalhe?.data;
}

function pessoaNotificacao(item) {
    return props.user.tipo === 'aluno' ? item.professor : item.aluno;
}

function avatarNotificacao(item) {
    return pessoaNotificacao(item)?.imagem;
}

function iniciaisNotificacao(item) {
    const pessoa = pessoaNotificacao(item);
    const sobrenome = pessoa?.sobrenome ? pessoa.sobrenome.charAt(0) : '';
    return pessoa?.nome ? (pessoa.nome.charAt(0) + sobrenome).toUpperCase() : '?';
}

function tempoRelativo(data) {
    if (!data) return '';
    const min = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `${dias} d`;
    return formatMask.viewDate(data);
}

async function buscarNotificacoes() {
    if (props.user.tipo === 'admin') return;
    await api.get('/orientacao/')
        .then((res) => {
            const itens = res.data?.item || [];
            const comAtividade = itens.filter((item) => item.situacao === 'confirmado' && item.notificacaoDetalhe);
            const pendentes = props.user.tipo === 'professor'
                ? itens.filter((item) => item.situacao === 'pendente').map((item) => ({ ...item, solicitacaoPendente: true }))
                : [];
            const semResposta = (item) => !item.cancelamento?.resposta?.data;
            const cancelamentos = itens
                .filter((item) => item.cancelamento?.solicitadoPor && item.cancelamento.solicitadoPor !== props.user.tipo && semResposta(item))
                .map((item) => ({ ...item, cancelamentoPendente: true }));
            const cancelamentosMeus = itens
                .filter((item) => item.cancelamento?.solicitadoPor === props.user.tipo && semResposta(item))
                .map((item) => ({ ...item, cancelamentoAguardando: true }));
            orientacoesComNotificacao.splice(0, orientacoesComNotificacao.length, ...pendentes, ...cancelamentos, ...cancelamentosMeus, ...comAtividade);
        })
        .catch(() => {});
}

async function marcarTodasNotificacoesVistas() {
    if (props.user.tipo === 'admin' || naoLidasCount.value === 0) return;
    await api.put('/orientacao/marcarNotificacoesVistas').catch(() => {});
    await buscarNotificacoes();
    window.dispatchEvent(new Event('sotcc:notificacao-vista'));
}

function marcarItemComoLido(item) {
    if (item.solicitacaoPendente || item.cancelamentoPendente) return;
    item.notificacaoLida = true;
}

watch(() => route.fullPath, buscarNotificacoes);

let pollInterval = null;
onMounted(() => {
    buscarNotificacoes();
    window.addEventListener('sotcc:notificacao-vista', buscarNotificacoes);
    pollInterval = setInterval(buscarNotificacoes, 20000);
});
onUnmounted(() => {
    window.removeEventListener('sotcc:notificacao-vista', buscarNotificacoes);
    if (pollInterval) clearInterval(pollInterval);
});

async function logout() {
    localStorage.removeItem("token");
    window.location.reload();
}
</script>