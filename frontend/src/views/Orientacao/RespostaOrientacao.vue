<template>
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-gray-600 bg-opacity-50">
        <main class="w-full md:w-[480px] lg:w-[480px] p-[24px] overflow-y-auto bg-white rounded-md flex flex-col gap-[24px]">
            <section class="grid grid-cols-1 gap-[14px]">
                <div class="flex items-center justify-between border-b border-gray-300" v-if="props?.usuario.tipo === 'professor' && orientacao.situacao !== 'confirmado'" >
                    <Texto as="h3" >
                        {{situacao==='confirmado'? 'Confirmar orientação':'Negar orientação'}}
                    </Texto>
                    <button
                        type="button"
                        :onClick="()=> emits('modal:open', false)"
                        class="cursor-pointer"
                    >
                    <PhX :size="18" class="fill-gray-700 hover:fill-black" />
                    </button>
                </div>
                <div class="flex flex-col gap-[4px]" v-if="props?.usuario.tipo === 'professor' && orientacao.situacao !== 'confirmado'">
                    <div class="flex items-center gap-[10px]">
                        <Texto as="body" for="resposta">
                            Resposta
                        </Texto>
                        <Texto as="body" color="gray" for="resposta" v-if="situacao !== 'negado'">
                            Opcional
                        </Texto>
                    </div>
                    <textarea
                        v-model="form.resposta"
                        id="resposta"
                        class="p-[8px] border border-principal rounded-md focus:outline-principal"
                        :placeholder="situacao === 'negado' ? 'Justifique o motivo.' : 'Escreva uma resposta para orientação.'"
                        maxlength="200"
                        rows="4"
                    ></textarea>
                </div>
                <div class="flex flex-col gap-[4px]" v-if="props?.usuario.tipo === 'professor' && orientacao.situacao === 'confirmado'">
                    <Texto as="h4">
                        Encerrar orientação
                    </Texto>
                    <Texto as="body" color="gray">
                        A orientação será cancelada imediatamente e o aluno {{ orientacao.aluno?.nome }} será avisado por e-mail.
                    </Texto>
                    <div class="flex items-center gap-[10px]">
                        <Texto as="body" for="motivo">
                            Motivo
                        </Texto>
                    </div>
                    <textarea
                        v-model="form.motivo"
                        id="motivo"
                        class="p-[8px] border border-principal rounded-md focus:outline-principal"
                        placeholder="Justifique o motivo do cancelamento."
                        maxlength="200"
                        rows="4"
                    ></textarea>
                </div>
                <div class="flex flex-col items-center text-center w-full gap-1" v-if="props?.usuario.tipo === 'aluno' && orientacao.situacao !== 'confirmado'">
                    <PhWarning :size="80" color="#fc9403" weight="light" />
                    <Texto as="h4" for="resposta">
                        Tem certeza que deseja cancelar sua solicitação de orientação ao professor {{ orientacao.professor.nome }}?
                    </Texto>
                </div>
                <div class="flex flex-col gap-[4px]" v-if="props?.usuario.tipo === 'aluno' && orientacao.situacao === 'confirmado'">
                    <Texto as="h4">
                        Solicitar cancelamento
                    </Texto>
                    <Texto as="body" color="gray">
                        O professor {{ orientacao.professor.nome }} precisa aceitar o cancelamento para a orientação ser encerrada.
                    </Texto>
                    <div class="flex items-center gap-[10px]">
                        <Texto as="body" for="motivo">
                            Motivo
                        </Texto>
                    </div>
                    <textarea
                        v-model="form.motivo"
                        id="motivo"
                        class="p-[8px] border border-principal rounded-md focus:outline-principal"
                        placeholder="Justifique o motivo do cancelamento."
                        maxlength="200"
                        rows="4"
                    ></textarea>
                </div>
            </section>
            <section class="flex justify-between gap-[24px] border-t border-gray-300 py-[10px]">
                <button
                    type="button"
                    :onClick="()=> emits('modal:open', false)"
                    class=" font-bold text-[14px] border hover:bg-gray-200 py-[8px] px-[12px] rounded-md cursor-pointer">
                    Cancelar
                </button>
                <button
                    type="button"
                    :onClick="solicitar"
                    v-if="props?.usuario.tipo === 'professor' && orientacao.situacao !== 'confirmado'"
                    class=" font-bold text-[14px] bg-principal hover:bg-principal-opaco text-white py-[8px] px-[12px] rounded-md cursor-pointer">
                    {{situacao==='confirmado'? 'Confirmar orientação':'Negar orientação'}}
                </button>
                <button
                    type="button"
                    :onClick="cancelarPedido"
                    v-if="props?.usuario.tipo === 'aluno' && orientacao.situacao !== 'confirmado'"
                    class=" font-bold text-[14px] bg-principal hover:bg-principal-opaco text-white py-[8px] px-[12px] rounded-md cursor-pointer">
                    Cancelar solicitação
                </button>
                <button
                    type="button"
                    :onClick="solicitarCancelamento"
                    v-if="orientacao.situacao === 'confirmado' && props?.usuario.tipo === 'aluno'"
                    class=" font-bold text-[14px] bg-principal hover:bg-principal-opaco text-white py-[8px] px-[12px] rounded-md cursor-pointer">
                    Solicitar cancelamento
                </button>
                <button
                    type="button"
                    :onClick="cancelarOrientacao"
                    v-if="orientacao.situacao === 'confirmado' && props?.usuario.tipo === 'professor'"
                    class=" font-bold text-[14px] bg-principal hover:bg-principal-opaco text-white py-[8px] px-[12px] rounded-md cursor-pointer">
                    Cancelar orientação
                </button>
            </section>
        </main>
    </div>
</template>

<script setup>
import Texto from '@components/Texto.vue'
import { PhX, PhWarning } from '@phosphor-icons/vue';
import { reactive } from "vue";
import { popupInfo } from '../../stores/util.js';
import api from "@/api.js";

const props = defineProps({
    orientacao: {
        type: Object,
        required: true,
    },
    situacao: {
        type: String,
        required: true,
    },
    usuario: {
        type: [Object],
        required: false,
    },
})

const emits = defineEmits(['modal:open']);

const form = reactive({
    resposta: "",
    motivo: "",
    id: "",
    situacao: 'negado',
});

async function solicitar(){
    if (props.situacao === 'negado' && !form.resposta?.trim()) {
        return popupInfo().warning('Justifique o motivo.');
    }
    form.id = props?.orientacao._id
    form.situacao = props.situacao;

    await api.put(`/orientacao/alterarSituacao`, form)
    .then((res)=>{
        popupInfo().success(res?.data?.msg);
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    })
    emits('modal:open', false)
}

async function cancelarPedido(){
    const formOrientacao = {
        id: props?.orientacao._id
    }
    await api.put(`/orientacao/alterarSituacao`, formOrientacao)
    .then((res)=>{
        popupInfo().success(res?.data?.msg);
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    }).finally(()=>emits('modal:open', false))
}

async function solicitarCancelamento(){
    if (!form.motivo?.trim()) {
        return popupInfo().warning('Justifique o motivo do cancelamento.');
    }
    await api.post(`/orientacao/${props?.orientacao._id}/solicitarCancelamento`, { motivo: form.motivo })
    .then((res)=>{
        popupInfo().success(res?.data?.msg);
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    }).finally(()=>emits('modal:open', false))
}

async function cancelarOrientacao(){
    if (!form.motivo?.trim()) {
        return popupInfo().warning('Justifique o motivo do cancelamento.');
    }
    await api.post(`/orientacao/${props?.orientacao._id}/cancelar`, { motivo: form.motivo })
    .then((res)=>{
        popupInfo().success(res?.data?.msg);
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    }).finally(()=>emits('modal:open', false))
}
</script>
