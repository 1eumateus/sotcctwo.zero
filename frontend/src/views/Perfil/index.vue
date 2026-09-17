<template>
    <EditarPerfil
        :form="form"
        @modal:open="openEditarPerfil = $event"
        @modal:update="start"
        v-if="openEditarPerfil"
    />
   <main class="flex-grow relative ">
        <section class="mx-auto max-w-5xl p-[14px] flex flex-col gap-[8px]">
            <div class="flex items-center gap-[8px] justify-between">
                <div class="flex flex-col">
                    <Texto as="small">
                        {{ form.tipo }}
                    </Texto>
                    <Texto as="h4">
                        {{ form.tipo !=='admin' ? ' Perfil público': 'Perfil privado' }}
                    </Texto>
                </div>
                <div class="flex gap-2">
                    <button 
                        v-if="form.tipo === 'professor'"
                        type="button" 
                         @click="()=>scrollTo('orientacoes')"
                        class="cursor-pointer flex items-center gap-[4px] px-[12px] py-[8px] border border-principal bg-terciaria text-white hover:bg-terciaria-opaco rounded-md"
                    >   Pedidos de orientação
                    </button>
                    <button 
                        type="button" 
                        :onClick="()=> openEditarPerfil = true" 
                        class="cursor-pointer flex items-center gap-[4px] px-[12px] py-[8px] border border-gray-400 bg-principal text-white hover:bg-principal-opaco rounded-md"
                    >   Editar
                        <PhPencil :size="20" />
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-[8px]">
                <section class="flex flex-col items-center gap-[4px] border rounded-md border-secundaria-opaco p-[10px] bg-white">
                    <img 
                        v-if="form?.imagem?.filename"
                        :src="`${urlApi}/uploads/${form?.imagem?.filename}`" 
                        :alt="form?.imagem?.originalname" 
                        class="h-[180px] w-[180px] rounded-md"
                    />
                    <img 
                        v-else
                        :src="`/ui/Sem_imagem.jpg`" 
                        :alt="'sem imagem'" 
                        class="h-[180px] w-[180px] rounded-md"
                    />
                    <Texto as="body-bold">
                        {{ form.nome }} ({{ form.matricula }})
                    </Texto>
                    <Texto as="body">
                        {{ form.instituicao }} 
                    </Texto>
                    <Texto as="body" v-if="form.subunidadesNomes.length > 0">
                        {{ form.subunidadesNomes [0][0] }} - {{ form.subunidadesNomes [0][1] }}
                    </Texto>
                    <div 
                        v-if="form.tipo === 'professor'"
                        :class="`${disponibilidades.find((item)=> item.value === form?.disponibilidade)?.color} flex justify-center rounded-2xl p-1`">
                        <Texto as="label">
                            Disponibilidade {{ form?.disponibilidade || '-' }} 
                        </Texto>
                    </div>
                    
                    <div class="flex flex-col gap-[8px] w-full">
                        <hr class="" />
                        <Texto as="body-bold">Contatos</Texto>
                        <div class="flex justify-center gap-[8px]">
                            <a :href="form.linkedin" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-blue-500 hover:text-blue-800" v-if="form.linkedin">
                                <PhLinkedinLogo :size="24"/>
                            </a>
                            <a :href="form.github" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-gray-800 hover:text-gray-900" v-if="form.github" >
                                <PhGithubLogo :size="24" />
                            </a>
                            <a :href="form.lattes" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="text-gray-800 hover:text-gray-900" v-if="form.lattes">
                                <img src="/curriculoLattes.jpeg" alt="Currículo Lattes" class="h-[24px] w-[24px]" />
                            </a>
                        </div>
                        <Texto as="body">
                            {{ form.email }}
                        </Texto>
                        <Texto as="body">
                            {{ form.telefone?.length > 8 ? formatMask.tel(form.telefone) : form.telefone }}
                        </Texto>
                    </div>
                    <div class="flex flex-col gap-[8px] w-full" v-if="form.subunidades.length > 1">
                        <hr class="" />
                        <Texto as="body-bold">Outros cursos de possível atuação</Texto>
                        <Texto as="body" v-for="(sub,index) in form.subunidadesNomes" :key='index'>
                            <span v-if="index != 0">{{ sub [0] }} - {{ sub [1] }}</span>
                        </Texto>
                    </div>
                    <div class="flex flex-col gap-[8px] w-full text-center justify-end h-full" v-if="form.tipo === 'professor'">
                        <hr class="" />
                        <Texto as="body">
                        </Texto>
                    </div>
                    
                </section>

                <section class="flex flex-col gap-[8px] border rounded-md border-secundaria-opaco p-[10px] col-span-2 bg-white">
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
                    <hr class="" v-if="form.tipo === 'professor'"/>
                    <div class="flex flex-col gap-[8px]" v-if="form.tipo === 'professor'">
                        <Texto as="body-bold">
                            Área de interesse
                        </Texto>
                        <Texto as="body">
                            {{ form.interesse || '-' }}
                        </Texto>
                    </div>
                    <hr class="" v-if="form.tipo === 'professor'"/>
                    <div class="flex flex-col gap-[8px]" v-if="form.tipo === 'professor'">
                        <Texto as="body-bold">
                            Trabalhos de conclusão orientados ({{ form.trabalhosFimCurso.length }})
                        </Texto>
                        <div v-for="(trabalho, index) in form.trabalhosFimCurso" :key='index' v-if="form.trabalhosFimCurso.length>0">
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
            <div id="orientacoes">
                <ListaOrientacao :usuario="props?.usuario"></ListaOrientacao>
            </div>            
        </section>
    </main>
</template>

<script setup>
import Texto from '@components/Texto.vue'
import { PhLinkedinLogo, PhGithubLogo, PhPencil  } from '@phosphor-icons/vue';
import { onMounted, reactive, ref } from "vue";
import api from "@/api.js";
import EditarPerfil from './EditarPerfil.vue'
import { popupInfo, formatMask } from '../../stores/util.js';
import ListaOrientacao from '../Orientacao/ListaOrientacao.vue';

const urlApi = import.meta.env.VITE_URL;

const openEditarPerfil = ref (false)
const situacao = ref ('')

const props = defineProps ({
    usuario: {
        type: [Object],
        required: false, 
    },
})

const disponibilidades = [
    { value: "", nome: "Não aplicado", color:'bg-blue-200' },
    { value: "indisponível", nome: "Indisponível", color:'bg-red-200' },
    { value: "matutino", nome: "Matutino", color:'bg-blue-200' },
    { value: "vespertino", nome: "Vespertino", color:'bg-blue-200' },
    { value: "noturno", nome: "Noturno", color:'bg-blue-200' },
    { value: "integral", nome: "Integral", color:'bg-blue-200' },
    { value: "flexivel", nome: "Flexível", color:'bg-blue-100' },
];

const form = reactive ({
    _id: false,
    nome: "",
    matricula: "",
    email: "",
    descricao: "",
    github: "",
    linkedin: "",
    senha: "",
    tipo: null,
    imagem: null,
    ativo: true,
    subunidadesNomes: [],
    subunidades: []
});

async function start () {
    const idUser = props?.usuario.id;
    await api.get (`/usuario/${idUser}`)
    .then ((res) => {
        Object.assign (form, res.data.usuario);
    }).catch ((e) => {
        popupInfo ().warning ('Erro ao procurar usuário.');
    })
}

function scrollTo (nome){
    const div = document.getElementById (nome);
    if (div) {
        div.scrollIntoView ({ behavior: 'smooth' });
    }
}

onMounted (start);
</script>