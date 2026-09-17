<template>
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-gray-600 bg-opacity-50">
            <main class="w-full md:w-[720px] lg:w-[720px] p-[24px] h-screen md:max-h-[720px] lg:max-h-[720px] overflow-y-auto bg-white rounded-md flex flex-col gap-[24px]">
                <section class="grid grid-cols-1 gap-[14px]">
                    <div class="flex items-center justify-between border-b border-gray-300">
                        <Texto as="h3">
                            Editar informações
                        </Texto>
                        <button 
                        type="button" 
                        :onClick="()=> emits('modal:open', false)" 
                        class="cursor-pointer"
                    >
                        <PhX :size="18" class="fill-gray-700 hover:fill-black" />
                    </button>
                       
                    </div>
                    <section class="flex items-center gap-2 relative">
                        <div v-if="form?.imagem?.filename && !imagePreview && !novaImagem" class="relative" >
                            <PhTrash 
                                :size="22" 
                                class="absolute right-0 bg-white border-2 border-principal fill-red-700 cursor-pointer"
                                @click="()=> form.imagem = null" 
                            />
                            <img 
                                :src="`${urlApi}/uploads/${form?.imagem?.filename}`" 
                                :alt="form?.imagem?.originalname" 
                                class="h-[140px] min-w-[140px] rounded border-2 border-principal"
                            />
                        </div>
                        <div v-if="imagePreview && novaImagem"  class="relative" >
                            <PhTrash 
                                :size="22" 
                                class="absolute right-0 bg-white border-2 border-principal fill-red-700 cursor-pointer"
                                @click="()=> {novaImagem = null; imagePreview = null}" 
                            />
                            <img 
                                v-if="imagePreview && novaImagem" 
                                :src="imagePreview" 
                                :alt="novaImagem?.name" 
                                class="h-[140px] min-w-[140px] rounded border-2 border-green-500"
                            />
                        </div>
                       
                        <div class="flex flex-col items-center w-full">
                            <label for="file" class="cursor-pointer w-full">
                                <div class="flex items-center justify-center text-center min-w-full h-[140px] border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition duration-200">
                                    <span class="text-gray-500" v-if="!imagePreview && !novaImagem">Selecione uma foto de até 10 MB. (Opcional)</span>
                                    <span class="text-gray-500" v-else>Imagem {{ novaImagem.name  }} selecionada</span>
                                </div>
                            </label>
                            <input 
                                type="file" 
                                id="file" 
                                name="image" 
                                accept="image/*" 
                                class="hidden" 
                                @change="handleFileUpload" 
                            />
                        </div>
                    </section>
                    <Texto as="h4">
                        Informações principais
                    </Texto>
                    <section class="grid grid-cols-2 gap-[10px]">
                        <Campo 
                            v-model="form.nome" 
                            label="Nome" 
                            id="nome" 
                            type="text"
                            :obrigatorio="true"
                            placeholder="ex.: Davi"
                            :maxLength="20"  
                        /> 
                        <Campo 
                            v-model="form.matricula" 
                            label="Matrícula" 
                            id="matricula" 
                            type="text"
                            :obrigatorio="false"
                            placeholder="ex.: 202033840046"
                            :maxLength="20"  
                        />
                    </section>
                    <Campo 
                        v-model="form.formacao" 
                        label="Formação acadêmica/profissional (Onde obteve os títulos, atuação profissional, etc.)" 
                        id="formacao" 
                        type="text"
                        :maxLength="500"
                        :obrigatorio="true"
                        placeholder="ex.: Mestrado em Inteligência artificial"
                        v-if="form.tipo === 'professor'"
                    />
                    <Campo 
                        v-model="form.interesse" 
                        label=" Áreas de Interesse (áreas de interesse de ensino e pesquisa)" 
                        id="interesse" 
                        type="text"
                        :maxLength="400"
                        :obrigatorio="true"
                        placeholder="ex.: Inteligência artificial, desenvolvimento web e automação"
                        v-if="form.tipo === 'professor'"
                    />

                    <div class="flex flex-col gap-[4px]"  v-if="form.tipo === 'professor'">
                        <div class="flex items-center gap-[4px]">
                            <Texto as="body" for="pesquisar">
                                Disponibilidade
                            </Texto>
                            <Texto as="body-bold" for="pesquisar" color="red">
                                *
                            </Texto>
                        </div>
                        <select 
                            v-model="form.disponibilidade" 
                            class="p-[8px] border border-principal h-11 rounded-md " >
                            <option 
                                :value="disponi.value" 
                                v-for="disponi in disponibilidades">
                                {{ disponi.nome }}
                            </option>
                        </select>
                    </div>

                    <div class="flex flex-col gap-[4px] ">
                        <div class="flex items-center gap-[4px]">
                            <Texto as="body" for="formdescricao">
                                Descrição
                            </Texto>
                            <Texto as="body" color="gray" for="formdescricao">
                                Opcional
                            </Texto>
                        </div>
                        <textarea 
                            v-model="form.descricao" 
                            id="formdescricao" 
                            class="p-[8px] border border-principal rounded-md focus:outline-principal" 
                            placeholder="Descrição com no máximo 100 caracteres."
                            maxlength="200"
                        >
                        </textarea>
                    </div>
                    <texto as="h4">
                        Lotação
                    </texto>
                    <Lotacoes 
                        :subunidades="form.subunidades" 
                        :unidades="form.unidades"
                        :multiplas-lotacoes="form.tipo === 'professor'"
                    />
                    <Texto as="h4" v-if="form.tipo === 'professor'">
                        Trabalhos de conclusão de curso
                    </Texto>
                    <div class="grid grid-cols-12 items-end gap-2" v-if="form.tipo === 'professor'">
                        <div class="col-span-10">
                            <Campo 
                                v-model="trabalho" 
                                label="Descrição" 
                                id="trabalho" 
                                type="text"
                                :obrigatorio="false"
                                placeholder=""
                                :maxLength="300"
                            />
                        </div>
                        <div class="col-span-2">
                            <button 
                                type="button" 
                                :onClick="editar"
                                :class="`${editandoTrabalho !==-1 ? ' bg-orange-600 ':' bg-principal hover:bg-principal-opaco '} w-full h-11 text-white font-bold text-sm rounded-md cursor-pointer`">
                                {{ editandoTrabalho !==-1 ? 'Salvar': 'Adicionar'}}
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-[4px] " v-if="form.tipo === 'professor'">
                        <div class="overflow-x-auto">
                            <table v-if="form?.trabalhosFimCurso?.length>0" class="min-w-full text-center ">
                                <thead>
                                    <tr class="bg-gray-400 font-bold border">
                                        <td class="p-2 text-left" >
                                            Descrição
                                        </td>
                                        <td class="p-2 text-left">
                                            Opções
                                        </td>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(participante, index) in form?.trabalhosFimCurso" :key="index" class="even:bg-gray-200" >
                                        <td class="p-2 text-left" >
                                            {{ participante }}
                                        </td>
                                        <td class="p-2 flex justify-center gap-1" >
                                
                                            <button 
                                                type="button" 
                                                class="cursor-pointer py-[10px] px-[12px] h-11 border border-gray-400 hover:bg-gray-300 rounded-md"
                                                :onClick="()=>removerTrabalho(index)">
                                                <PhTrash :size="22" />
                                            </button>
                                            <button 
                                                type="button" 
                                                class="cursor-pointer py-[10px] px-[12px] h-11 border border border-gray-400 hover:bg-gray-300 rounded-md"
                                                :onClick="()=>editarTrabalho(index)"
                                            >
                                                    <PhPencilSimple :size="22" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table> 
                            <Texto as="label" v-else>
                                Sem trabalhos adicionados.
                            </Texto>
                        </div>
                    </div>
                    <Texto as="h4">
                        Informações de contato
                    </Texto>
                    <Campo 
                        v-model="form.email" 
                        label="Email" 
                        id="email" 
                        type="email"
                        :obrigatorio="true"
                        :maxLength="50"
                        placeholder="ex.: exemplo@exemplo.com"
                    /> 
                    <Campo 
                        v-model="form.telefone" 
                        label="Telefone" 
                        id="telefone" 
                        type="text"
                        :maxLength="15"
                        :obrigatorio="false"
                        placeholder="ex.: (00) 90000-0000"
                        @input="form.telefone = formatMask.tel(form.telefone)"
                    />
                    <Texto as="h4">
                       Redes sociais (opcional)
                    </Texto>
                    <Campo 
                        v-model="form.lattes" 
                        label="Currículo Lattes" 
                        id="lattes" 
                        type="text"
                        :maxLength="90"
                        :obrigatorio="false"
                        placeholder="ex.: http://lattes.cnpq.br/"
                    />
                    <Campo 
                        v-model="form.linkedin" 
                        label="LinkedIn" 
                        id="linkedin" 
                        type="text"
                        :maxLength="90"
                        :obrigatorio="false"
                        placeholder="ex.: https://www.linkedin.com/"
                    />
                    <Campo 
                        v-model="form.github" 
                        label="GitHub" 
                        id="github" 
                        type="text"
                        :maxLength="90"
                        :obrigatorio="false"
                        placeholder="ex.: https://github.com/"
                    />

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
                        :onClick="salvar" 
                        class=" font-bold text-[14px] bg-principal text-white hover:bg-principal-opaco py-[8px] px-[12px] rounded-md cursor-pointer">
                        Salvar
                    </button>
                </section>

            </main>
    </div>
</template>

<script setup>
import Campo from '@components/Campo.vue';
import Texto from '@components/Texto.vue';
import { PhTrash, PhPencilSimple, PhX } from '@phosphor-icons/vue';
import { onMounted, reactive, ref } from "vue";
import api from "@/api.js";
import { popupInfo, formatMask } from '../../stores/util.js';
import Lotacoes from './Lotacoes.vue';

const emits = defineEmits(['modal:open', 'modal:update']);
const urlApi = import.meta.env.VITE_URL;

const novaImagem = ref(null)
const imagePreview = ref(null);
const editandoTrabalho = ref(-1);

const disponibilidades = [
    { value: "indisponível", nome: "Indisponível" },
    { value: "matutino", nome: "Matutino" },
    { value: "vespertino", nome: "Vespertino" },
    { value: "noturno", nome: "Noturno" },
    { value: "integral", nome: "Integral" },
    { value: "flexivel", nome: "Flexível" },
];

const form = reactive({
    _id: false,
    nome: "",
    matricula: "",
    formacao: "",
    email: "",
    descricao: "",
    github: "",
    linkedin: "",
    telefone: "",
    disponibilidade: "",
    senha: "",
    imagem: "",
    trabalhosFimCurso: [],
    subunidades: [],
    unidades: [],
    tipo: null,
    ativo: true,
});

const props = defineProps({
    form: {
        type: Object,
        required: true
    },
});

function start () {
    Object.assign(form, props?.form);
    form.senha = "";
}

function handleFileUpload (event) {
    const file = event.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
        return popupInfo ().warning ('Imagem muito grande. Limite de 10MB.');
    }
    if (file && !file.type.startsWith ('image/')) {
        return popupInfo ().warning ('Formato de arquivo inválido. Por favor, envie uma imagem.');
    }
    novaImagem.value = file;
    imagePreview.value = URL.createObjectURL(file); 
}

async function salvarImagem () {
    const formData = new FormData ();
    if (novaImagem.value) {
        form.imagem = novaImagem.value;
        formData.append ('image', form.imagem);
    }
    try {
        await api.post (`/usuario/imagem/`, formData);
    } catch (e) {
        popupInfo ().warning (e.response?.data?.msg || e);
    }
}

async function salvar () {
    if (!form.nome?.trim ()){
        return popupInfo ().warning ('Informe seu nome.');
    }
    if (!form.email?.trim ()){
        return popupInfo ().warning ('Informe email.');
    }
    if (form.linkedin && !validateLinkedin (form.linkedin)){
        return popupInfo ().warning ('Linkedin inválido.');
    }
    if (form.github && !validateGithub (form.github)){
        return popupInfo ().warning ('Github inválido.');
    }
    if (form.lattes && !validateLattes (form.lattes)){
        return popupInfo ().warning ('Currículo Lattes inválido.');
    }
    await salvarImagem ();
    await api.put (`/usuario/editar`, form)
    .then (() => {
        popupInfo ().success ('Usuário editado com sucesso.');
        emits ('modal:open', false)
        emits ('modal:update', true)
    }).catch ((e) => {
        popupInfo ().warning (e.response.data.msg || e);
    })
}

function validateGithub (link) {
    const github = /^https:\/\/github\.com\/[A-z0-9_-]+\/?$/;
    return github.test (link);
}

function validateLinkedin (link) {
    const linkedin = /^https:\/\/(www\.)?linkedin\.com\/in\/[A-z0-9_-]+\/?$/;
    return linkedin.test (link);
}

function validateLattes (link) {
    const lattes = /^http:\/\/lattes\.cnpq\.br\/\d{15,17}$/;
    return lattes.test (link);
}

function removerTrabalho (index){
    editandoTrabalho.value = -1;
    trabalho.value = '';
    form.trabalhosFimCurso.splice (index, 1);
}

const trabalho = ref ('');

function editarTrabalho (index) {
    trabalho.value = form.trabalhosFimCurso [index];
    editandoTrabalho.value = index;
}

async function editar () {
    if (!trabalho.value.trim ()) return popupInfo ().warning ('Informe descrição');
    if (editandoTrabalho.value !== -1){
        form.trabalhosFimCurso [editandoTrabalho.value] = trabalho.value;
        editandoTrabalho.value = -1;
    }
    else {
        form.trabalhosFimCurso.push (trabalho.value)
    }
    trabalho.value = '';
}

onMounted (start);
</script>