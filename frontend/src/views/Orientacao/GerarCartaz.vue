<template>
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-gray-600 bg-opacity-50">
        <main class="w-full md:w-[720px] lg:w-[720px] p-[24px] max-h-[90vh] overflow-y-auto bg-white rounded-md flex flex-col gap-[24px]">
            <div class="flex items-center justify-between border-b border-gray-300">
                <Texto as="h3">
                    Cartaz de divulgação
                </Texto>
                <button
                    type="button"
                    :onClick="()=> emits('modal:open', false)"
                    class="cursor-pointer"
                >
                    <PhX :size="18" class="fill-gray-700 hover:fill-black" />
                </button>
            </div>

            <div class="border border-secundaria-opaco rounded-md bg-secundaria p-[12px] flex flex-col gap-[2px]">
                <Texto as="label" color="gray">Aluno</Texto>
                <Texto as="body-bold">{{ form.aluno?.nome }} {{ form.aluno?.sobrenome }}</Texto>
            </div>

            <div class="border border-secundaria-opaco rounded-md bg-secundaria p-[12px] flex items-center gap-[8px]" v-if="!form.presencial">
                <PhVideoCamera :size="20" class="fill-principal flex-shrink-0" />
                <Texto as="body" color="gray">
                    A defesa será transmitida automaticamente pela plataforma quando o orientador iniciar a videochamada — não precisa informar link.
                </Texto>
            </div>

            <div class="border border-terciaria/40 rounded-md bg-terciaria/10 p-[10px] flex items-center gap-[8px]" v-if="form.cartazGerado">
                <PhVideoCamera :size="18" class="fill-terciaria-opaco flex-shrink-0" />
                <Texto as="small" color="gray">
                    O cartaz já foi gerado - a sala da defesa ficou fixa e não muda mais, mesmo editando os outros campos.
                </Texto>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-12 gap-[12px] items-end">
                <div class="col-span-1 md:col-span-6 lg:col-span-6">
                    <Campo
                        v-model="form.coorientador.nome"
                        label="Nome do coorientador"
                        id="coorientadorNome"
                        type="text"
                        :obrigatorio="false"
                        placeholder="ex.: Davi Barroso"
                        :maxLength="30"
                    />
                </div>
                <div class="col-span-1 md:col-span-6 lg:col-span-6">
                    <Campo
                        v-model="form.coorientador.instituicao"
                        label="Instituição"
                        id="coorientadorinstituicao"
                        type="text"
                        :obrigatorio="false"
                        placeholder="ex.: UFPA/FECOMP"
                        :maxLength="20"
                    />
                </div>
                <div class="col-span-2 md:col-span-12 lg:col-span-12">
                    <Campo
                        v-model="form.tema"
                        label="Tema"
                        id="tema"
                        type="text"
                        :obrigatorio="true"
                        placeholder="ex.: SOTCC - Sistema de orientação em TCC"
                    />
                </div>
                <div class="col-span-2 md:col-span-12 lg:col-span-12">
                    <label class="inline-flex items-center cursor-pointer gap-[12px]">
                        <input
                            v-model="form.presencial"
                            type="checkbox"
                            class="sr-only peer"
                        />
                        <div
                            class="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                        > </div>
                        <Texto as="body">
                            Presencial
                        </Texto>
                    </label>
                </div>
                <div class="col-span-2 md:col-span-12 lg:col-span-12" v-if="form.presencial">
                    <Campo
                        v-model="form.local"
                        label="Local (Endereço)"
                        id="local"
                        type="text"
                        :obrigatorio="false"
                        placeholder="ex.: R. Augusto Corrêa, 01 - Guamá"
                        :maxLength="200"
                    />
                </div>
                <div class="col-span-1 md:col-span-6 lg:col-span-6">
                    <Campo
                        v-model="form.dataDefesa"
                        label="Data de defesa"
                        id="dataDefesa"
                        type="date"
                        :obrigatorio="true"
                    />
                </div>
                <div class="col-span-1 md:col-span-6 lg:col-span-6">
                    <Campo
                        v-model="form.horaDefesa"
                        label="Hora da defesa"
                        id="horaDefesa"
                        type="time"
                        placeholder="10:30"
                        :obrigatorio="true"
                    />
                </div>
            </div>

            <hr class="border-gray-300" />

            <div class="flex flex-col gap-[8px]">
                <Texto as="body-bold">
                    Banca examinadora
                </Texto>
                <div class="grid grid-cols-2 md:grid-cols-12 items-end gap-[8px]">
                    <div class="col-span-1 md:col-span-5 lg:col-span-5">
                        <Campo
                            v-model="participanteBanca.nome"
                            label="Novo participante da banca"
                            id="nome"
                            type="text"
                            :obrigatorio="false"
                            placeholder="ex.: Prof. Dr. Davi Barroso"
                            :maxLength="30"
                        />
                    </div>
                    <div class="col-span-1 md:col-span-5 lg:col-span-5">
                        <Campo
                            v-model="participanteBanca.instituicao"
                            label="Instituição"
                            id="instituicao"
                            type="text"
                            :obrigatorio="false"
                            placeholder="ex.: UFPA/FECOMP"
                            :maxLength="20"
                        />
                    </div>
                    <div class="col-span-2 md:col-span-2 lg:col-span-2">
                        <button
                            type="button"
                            :onClick="editar"
                            :class="`${editandoParticipante !==-1 ? ' bg-orange-600 ':' bg-principal hover:bg-principal-opaco '} w-full h-11 text-white font-bold text-sm rounded-md cursor-pointer`">
                            {{ editandoParticipante !==-1 ? 'Salvar': 'Adicionar'}}
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table v-if="form.banca.length>0" class="min-w-full text-center ">
                        <thead>
                            <tr class="bg-secundaria-opaco font-bold border">
                                <td class="p-2 text-left" >
                                    Nome
                                </td>
                                <td class="p-2 text-left" >
                                    Instituição
                                </td>
                                <td class="p-2 text-center">
                                    Opções
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(participante, index) in form.banca" :key="index" class="even:bg-secundaria" >
                                <td class="p-2 text-left" >
                                    {{ participante.nome }}
                                </td>
                                <td class="p-2 text-left">
                                    {{ participante.instituicao }}
                                </td>
                                <td class="p-2 flex justify-center gap-1" >
                                    <button
                                        type="button"
                                        class="cursor-pointer py-[8px] px-[10px] border border-gray-300 hover:bg-gray-200 rounded-md"
                                        :onClick="()=>removerParticipante(index)">
                                        <PhTrash :size="18" />
                                    </button>
                                    <button
                                        type="button"
                                        class="cursor-pointer py-[8px] px-[10px] border border-gray-300 hover:bg-gray-200 rounded-md"
                                        :onClick="()=>editarParticipante(index)"
                                    >
                                        <PhPencilSimple :size="18" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <Texto as="label" color="gray" v-else>
                        Sem participantes da banca.
                    </Texto>
                </div>
            </div>

            <section class="flex justify-between gap-[24px] border-t border-gray-300 pt-[10px]">
                <button
                    type="button"
                    :onClick="salvar"
                    class="font-bold text-[14px] border hover:bg-gray-200 py-[8px] px-[12px] rounded-md cursor-pointer">
                    Salvar alterações
                </button>
                <button
                    type="button"
                    :onClick="gerarConvite"
                    class="font-bold text-[14px] bg-terciaria hover:bg-terciaria-opaco text-white py-[8px] px-[12px] rounded-md cursor-pointer">
                    Gerar cartaz de divulgação
                </button>
            </section>
        </main>
    </div>
</template>

<script setup>
import { PhTrash, PhPencilSimple, PhX, PhVideoCamera } from '@phosphor-icons/vue';
import Texto from '@components/Texto.vue'
import Campo from '@components/Campo.vue'
import { reactive, ref } from "vue";
import api from "@/api.js";
import { popupInfo } from '../../stores/util.js';
import { useLoaderState } from "../../stores/isLoading.js";

const isLoading = useLoaderState();

const props = defineProps({
    form: {
        type: Object,
        required: true,
    },
})

const emits = defineEmits(['modal:open']);

const participanteBanca = reactive({
    nome: '',
    instituicao: '',
})
const editandoParticipante = ref(-1);

// ponytail: o aluno define o tema na fase de Pré-defesa (editável até a
// Versão final); se o professor ainda não digitou um tema aqui, puxa de lá
// pra não retrabalhar.
if (!props.form.tema?.trim()) {
    const temaDoAluno = props.form.fases?.find((f) => f.nome === 'Pré-defesa')?.descricao;
    if (temaDoAluno?.trim()) props.form.tema = temaDoAluno;
}

function removerParticipante(index){
    props.form.banca.splice(index, 1);
    salvar()
}

function editarParticipante(index){
    Object.assign(participanteBanca, props.form.banca[index])
    editandoParticipante.value = index;
}

async function editar(){
    if(!participanteBanca.nome?.trim()) return popupInfo().warning('Informe nome do participante');
    if(!participanteBanca.instituicao?.trim()) return popupInfo().warning('Informe instituição do participante');

    if(editandoParticipante.value !== -1){
        Object.assign(props.form.banca[editandoParticipante.value] , participanteBanca)
        editandoParticipante.value = -1;
    }else{
        props.form.banca.push({
                nome: participanteBanca.nome,
                instituicao: participanteBanca.instituicao
        })
    }
    participanteBanca.nome = ''
    participanteBanca.instituicao = ''
    salvar()
}

async function salvar(){
    if (props.form.link?.trim() && !props.form.link?.startsWith('https://')) {
        return popupInfo().warning('Informe um link válido.');
    }

    await api.put(`/orientacao/editar`, props.form)
    .then((res)=>{
        popupInfo().success(res?.data?.msg);
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    })
}

async function gerarConvite(){
    if(!props.form.tema?.trim()){
        return popupInfo().warning('Informe tema do TCC.');
    }
    if(!props.form.dataDefesa){
        return popupInfo().warning('Informe data de defesa do TCC.');
    }
    if(!props.form.horaDefesa){
        return popupInfo().warning('Informe hora de defesa do TCC.');
    }
    if(props.form.banca.length<2){
        return popupInfo().warning('Informe ao menos 2 examinadores.');
    }
    if (props.form.link?.trim() && !props.form.link?.startsWith('https://')) {
        return popupInfo().warning('Informe um link válido.');
    }

    isLoading.changeStateTrue()
    // a partir daqui a sala de defesa é definitiva - o botão de reunião do
    // Acompanhamento vira "Sala de defesa" e para de trocar de sala.
    props.form.cartazGerado = true;
    // ponytail: gerar o cartaz precisa salvar antes — senão a defesa fica
    // com data/tema atualizados só no PDF, sem aparecer na vitrine pública.
    const salvouAntes = await api.put(`/orientacao/editar`, props.form)
        .then(() => true)
        .catch((e) => {
            popupInfo().warning(e?.response?.data?.msg || e);
            return false;
        });
    if (!salvouAntes) {
        return isLoading.changeStateFalse();
    }
    await api.post(`/orientacao/gerarConvite`, props.form, {
        responseType: 'blob'
    })
    .then((res)=>{
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'cartaz de divulgação.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
        popupInfo().success('Cartaz gerado com sucesso.');
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    }).finally(()=> isLoading.changeStateFalse())
}
</script>
