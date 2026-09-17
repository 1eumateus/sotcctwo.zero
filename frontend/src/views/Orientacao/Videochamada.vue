<template>
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-gray-600 bg-opacity-50">
        <main class="w-full h-full md:w-[90vw] md:h-[85vh] md:rounded-md bg-white flex flex-col overflow-hidden">
            <div class="flex items-center justify-between border-b border-gray-300 p-[14px]">
                <Texto as="h3">
                    {{ modo === 'reuniao' ? 'Reunião' : 'Videochamada' }}
                </Texto>
                <button type="button" :onClick="fechar" class="cursor-pointer">
                    <PhX :size="18" class="fill-gray-700 hover:fill-black" />
                </button>
            </div>

            <div class="flex-grow flex items-center justify-center">
                <div v-if="carregando" class="flex flex-col items-center gap-[8px]">
                    <PhSpinnerGap :size="32" class="animate-spin fill-principal" />
                    <Texto as="body" color="gray">Conectando à videochamada...</Texto>
                </div>

                <div v-else-if="erro" class="flex flex-col items-center gap-[8px] text-center px-[24px]">
                    <PhVideoCameraSlash :size="40" class="fill-red-500" />
                    <Texto as="body-bold">{{ erro }}</Texto>
                    <button
                        type="button"
                        class="cursor-pointer mt-[8px] px-[14px] py-[8px] bg-principal hover:bg-principal-opaco text-white rounded-md font-bold text-[13px]"
                        @click="buscarToken"
                    >
                        Tentar novamente
                    </button>
                </div>

                <div v-else-if="jaas.token" class="w-full h-full">
                    <JitsiMeeting
                        domain="8x8.vc"
                        :room-name="`${jaas.appId}/${jaas.roomName}`"
                        :jwt="jaas.token"
                        width="100%"
                        height="100%"
                        :config-overwrite="{ startWithAudioMuted: true }"
                        :user-info="{ displayName: props.usuario?.nome }"
                        @on-ready-to-close="fechar"
                        @get-iframe-ref-on-api-ready="(parentNode) => { parentNode.style.height = '100%'; parentNode.style.width = '100%'; }"
                    />
                </div>
            </div>
        </main>
    </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { JitsiMeeting } from "@jitsi/vue-sdk";
import { PhX, PhVideoCameraSlash, PhSpinnerGap } from '@phosphor-icons/vue';
import Texto from '@components/Texto.vue';
import api from "@/api.js";

const props = defineProps({
    orientacaoId: {
        type: String,
        required: true,
    },
    usuario: {
        type: [Object],
        required: false,
    },
    ehProfessor: {
        type: Boolean,
        default: false,
    },
    modo: {
        type: String,
        default: 'defesa',
    },
});

const emits = defineEmits(['modal:open']);

const carregando = ref(true);
const erro = ref('');
const jaas = reactive({ token: '', roomName: '', appId: '' });

function rotaEntrar() {
    if (props.modo !== 'reuniao') return `/orientacao/${props.orientacaoId}/videochamada/token`;
    return props.ehProfessor
        ? `/orientacao/${props.orientacaoId}/reuniao/criar`
        : `/orientacao/${props.orientacaoId}/reuniao/entrar`;
}

async function buscarToken() {
    carregando.value = true;
    erro.value = '';
    jaas.token = '';
    await api.post(rotaEntrar())
        .then((res) => {
            jaas.token = res.data.token;
            jaas.roomName = res.data.roomName;
            jaas.appId = res.data.appId;
        })
        .catch((e) => {
            erro.value = e?.response?.data?.msg || 'Erro ao conectar à videochamada.';
        })
        .finally(() => carregando.value = false);
}

async function fechar() {
    if (props.ehProfessor) {
        const rotaEncerrar = props.modo === 'reuniao'
            ? `/orientacao/${props.orientacaoId}/reuniao/encerrar`
            : `/orientacao/${props.orientacaoId}/videochamada/encerrar`;
        await api.put(rotaEncerrar).catch(() => {});
    }
    emits('modal:open', false);
}

buscarToken();
</script>
