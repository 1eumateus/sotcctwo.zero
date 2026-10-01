<template>
    <SolicitarOrientacao
        @modal:open="recarregar($event)"
        :professor="form._id"
        :emailProfessor="form.email"
        :nomeAluno="usuario.nome"
        :aluno="usuario.id"
        v-if="openSolicitarOrientacao"
    />
   <main class="flex-grow relative ">
        <section class="mx-auto max-w-5xl p-[14px] flex flex-col gap-[8px]">   
            <div class="flex flex-col">
                <Texto as="small">
                    {{ form.tipo }}
                </Texto>
                <Texto as="h4">
                    {{ form.tipo !=='admin' ? ' Perfil público': 'Perfil privado' }}
                </Texto>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-[8px]">
                <section class="flex flex-col items-center gap-[4px] border rounded-md border-secundaria-opaco p-[10px] bg-white">
                    <img 
                        v-if="form?.imagem?.filename"
                        :src="`${urlApi}/uploads/${form?.imagem?.filename}`" 
                        :alt="form?.imagem?.originalname" 
                        class="min-h-[180px] w-[180px] rounded-md"
                    />
                    <img 
                        v-else
                        :src="`/ui/Sem_imagem.jpg`" 
                        :alt="'sem imagem'" 
                        class="min-h-[180px] w-[180px] rounded-md"
                    />
                    <Texto as="body-bold">
                        {{ form.nome }} {{ form.sobrenome }}
                    </Texto>
                    <Texto as="body">
                        {{ form.instituicao }} 
                    </Texto>
                    <div 
                         v-if="!solicitacaoEnviada"
                        :class="`${disponibilidades.find((item)=> item.value === form?.disponibilidade)?.color} flex justify-center rounded-2xl p-1`">
                        <Texto as="label">
                            Disponibilidade {{ form?.disponibilidade || '-' }} 
                        </Texto>
                    </div>
                    <div class="flex justify-end" v-if="props?.usuario.tipo === 'aluno'">
                        <button 
                            v-if="form.disponibilidade !== 'indisponível' && !solicitacaoEnviada && !jaOrientado"
                            @click="()=> openSolicitarOrientacao = true" 
                            class=" font-bold text-[14px] bg-green-300 hover:bg-green-400 py-[8px] px-[12px] rounded-md cursor-pointer">
                            Solicitar orientação
                        </button>
                        <button 
                            v-if="solicitacaoEnviada"
                            class=" font-bold text-[14px] bg-orange-400 py-[8px] px-[12px] rounded-md cursor-not-allowed">
                            {{ estadoOrientacao==='confirmado' ? 'Em orientação' : 'Orientação solicitada' }}
                        </button>
                        <button
                            v-if="jaOrientado && !solicitacaoEnviada"
                            disabled
                            title="Cada aluno só pode ter um orientador."
                            class=" font-bold text-[14px] bg-gray-300 text-gray-600 py-[8px] px-[12px] rounded-md cursor-not-allowed">
                            Você já tem orientador
                        </button>
                   </div>
                    
                   <div class="flex flex-col gap-[8px] w-full">
                        <hr class="" />
                        <div class="flex justify-center gap-[8px]">
                            <a :href="form.linkedin" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-blue-500 hover:text-blue-800" v-if="form.linkedin">
                                <PhLinkedinLogo :size="22"/>
                            </a>
                            <a :href="form.github" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-gray-800 hover:text-gray-900" v-if="form.github">
                                <PhGithubLogo :size="22" />
                            </a>
                            <a :href="form.lattes" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-gray-800 hover:text-gray-900 flex gap-1 " v-if="form.lattes">
                                <img src="/curriculoLattes.jpeg" alt="Currículo Lattes" class="h-[22px] w-[20px]" />
                            </a>
                        </div>
                        <Texto as="body">
                            {{ form.email }}
                        </Texto>
                        <Texto as="body">
                            {{ formatMask.tel(form.celular) }}
                        </Texto>
                    </div>
                    <div class="flex flex-col gap-[8px] w-full text-center justify-end h-full">
                        <hr class="" />
                        <Texto as="body">
                            Orientando {{ totalOrientacao || 0 }} aluno(s)
                        </Texto>
                    </div>
                </section>

                <section class="flex flex-col justify-between gap-[8px] border rounded-md border-secundaria-opaco p-[10px] col-span-2 bg-white">
                    <div class="flex flex-col gap-[8px]">
                        <Texto as="body-bold">
                            Descrição
                        </Texto>
                        <Texto as="body">
                            {{ form.descricao || 'Não informado.' }}
                        </Texto>
                    </div>
                    <hr class="" v-if="form.tipo === 'professor'" />
                    <div class="flex flex-col gap-[8px]" 
                        v-if="form.tipo === 'professor'"
                    >
                        <Texto as="body-bold">
                            Formação acadêmica/profissional
                        </Texto>
                        <Texto as="body">
                            {{ form.formacao || 'Não informado.' }}
                        </Texto>
                    </div>
                    <hr class=""/>
                    <div class="flex flex-col gap-[8px]">
                        <Texto as="body-bold">
                            Área de interesse
                        </Texto>
                        <Texto as="body">
                            {{ form.interesse || '-' }}
                        </Texto>
                    </div>
                    <hr class=""/>
                    <div class="flex flex-col gap-[8px]">
                        <Texto as="body-bold">
                            Trabalhos de conclusão orientados ({{ form?.trabalhosFimCurso?.length }})
                        </Texto>
                        <div v-for="(trabalho, index) in form?.trabalhosFimCurso" :key='index' v-if="form?.trabalhosFimCurso?.length>0">
                            <Texto as="body">
                              <b>{{ index+1 }}.</b>  {{ trabalho }}
                            </Texto>
                        </div>
                        <Texto as="body" v-else>
                            Sem trabalhos de conclusão orientados.
                        </Texto>
                    </div>
                </section>
            </div>
        </section>
    </main>
</template>

<script setup>
import Texto from '@components/Texto.vue'
import { PhLinkedinLogo, PhGithubLogo  } from '@phosphor-icons/vue';
import { onMounted, reactive, ref } from "vue";
import api from "@/api.js";
import { popupInfo } from '../../stores/util.js';
import {useRoute } from "vue-router";
import { formatMask } from '../../stores/util.js';
import SolicitarOrientacao from '../Orientacao/SolicitarOrientacao.vue';

const openSolicitarOrientacao = ref(false);
const orientacoes = reactive([]);
const solicitacaoEnviada = ref(false);
const jaOrientado = ref(false);
const urlApi = import.meta.env.VITE_URL;
const estadoOrientacao = ref('');
const totalOrientacao = ref(0);

const disponibilidades = [
    { value: "", nome: "Não aplicado", color:'bg-blue-200' },
    { value: "indisponível", nome: "Indisponível", color:'bg-red-200' },
    { value: "matutino", nome: "Matutino", color:'bg-blue-200' },
    { value: "vespertino", nome: "Vespertino", color:'bg-blue-200' },
    { value: "noturno", nome: "Noturno", color:'bg-blue-200' },
    { value: "integral", nome: "Integral", color:'bg-blue-200' },
    { value: "flexivel", nome: "Flexível", color:'bg-blue-100' },
];

const route = useRoute();

const props = defineProps({
    usuario: {
        type: [Object],
        required: false, 
    },
})

const form = reactive({
    _id: false,
    nome: "",
    sobrenome: "",
    email: "",
    descricao: "",
    telefone: "",
    github: "",
    linkedin: "",
    senha: "",
    trabalhosFimCurso: [],
    tipo: null,
    ativo: true,
});

async function start() {
    if (route?.params?.id) {
        form._id = route.params.id;
        await api.get(`/usuario/${form._id}`)
        .then((res)=>{
            Object.assign(form, res.data.usuario)
        }).catch((e)=>{
            console.log(e)
            popupInfo().warning('Erro ao procurar usuário.');
        })
    }
    if(props?.usuario.tipo === 'aluno'){
        listarOrientacao()
    }
}

async function listarOrientacao(){
    await api.get(`/orientacao/`)
    .then((res)=>{
        Object.assign(orientacoes, res.data?.item)
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    })

    solicitacaoEnviada.value = false;
    jaOrientado.value = orientacoes.some((o) => o.situacao === 'confirmado');
    for(let i=0;i<orientacoes?.length;i++){
        const professor = orientacoes[i]?.professor
        if(professor?._id === form?._id){
            estadoOrientacao.value = orientacoes[i].situacao
            solicitacaoEnviada.value = true;
            break;
        }
    }

    await api.get(`/orientacao/professor/${form._id}`)
    .then((res)=>{
        totalOrientacao.value = res.data
    })
}

async function recarregar(event){
    openSolicitarOrientacao.value = event
    await start();
}

onMounted(start);
</script>