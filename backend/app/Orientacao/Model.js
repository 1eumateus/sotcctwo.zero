import mongoose from "mongoose";
const { Schema, model } = mongoose;

const arquivoFaseSchema = new Schema ({
    originalname: String,
    filename: String,
    path: String,
    size: Number,
    dataEnvio: {
        type: Date,
        default: Date.now,
    },
});

const comentarioFaseSchema = new Schema ({
    autor: String,
    texto: String,
    data: {
        type: Date,
        default: Date.now,
    },
    anexo: {
        type: arquivoFaseSchema,
        default: null,
    },
    editado: {
        type: Boolean,
        default: false,
    },
});

const atividadeFaseSchema = new Schema ({
    titulo: String,
    tipo: {
        type: String,
        enum: ['texto', 'arquivo'],
        default: 'texto',
    },
    prazo: {
        type: Date,
        default: null,
    },
    concluida: {
        type: Boolean,
        default: false,
    },
    concluidaEm: {
        type: Date,
        default: null,
    },
    resposta: {
        type: String,
        default: '',
    },
    arquivos: [arquivoFaseSchema],
    criadaEm: {
        type: Date,
        default: Date.now,
    },
});

const faseSchema = new Schema ({
    nome: String,
    situacao: {
        type: String,
        default: 'pendente',
    },
    aprovadaEm: {
        type: Date,
        default: null,
    },
    prazo: {
        type: Date,
        default: null,
    },
    prazoAlteradoEm: {
        type: Date,
        default: null,
    },
    descricao: {
        type: String,
        default: '',
    },
    descricaoAlteradaEm: {
        type: Date,
        default: null,
    },
    lembretePrazoEnviado: {
        type: Boolean,
        default: false,
    },
    arquivos: [arquivoFaseSchema],
    comentarios: [comentarioFaseSchema],
    atividades: [atividadeFaseSchema],
});

const modelSchema = new Schema ({
    ativo: {
        type: Boolean,
        default: true,
    },
    dataCriacao: {
        type: Date,
        default: Date.now,
    },
    situacao: {
        type: String,
        default: 'pendente',
    },
    confirmadoEm: {
        type: Date,
        default: null,
    },
    tema: {
        type: String,
    },
    link: {
        type: String,
    },
    local: {
        type: String,
    },
    presencial: {
        type: Boolean,
        default: false,
    },
    aluno: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Usuario",
        required: true,
    },
    professor: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Usuario",
        required: true,
    },
    proposta: {
        type: String,
        required: false,
    },
    resposta: {
        type: String,
        required: false,
    },
    banca: [{
        nome: String,
        instituicao: String,
    }],
    coorientador: {
        nome: String,
        instituicao: String,
    },
    dataDefesa:{
        type: Date,
        default: null,
        required: false,
    },
    chamadaAoVivo: {
        ativa: {
            type: Boolean,
            default: false,
        },
        iniciadaEm: {
            type: Date,
            default: null,
        },
    },
    cartazGerado: {
        type: Boolean,
        default: false,
    },
    reuniao: {
        salaId: {
            type: String,
            default: null,
        },
        ativa: {
            type: Boolean,
            default: false,
        },
        iniciadaEm: {
            type: Date,
            default: null,
        },
        agendadaPara: {
            type: Date,
            default: null,
        },
    },
    horaDefesa:{
        type: String,
        default: null,
    },
    fases: {
        type: [faseSchema],
        default: () => ([
            { nome: 'Proposta' },
            { nome: 'Desenvolvimento' },
            { nome: 'Pré-defesa' },
            { nome: 'Versão final' },
        ]),
    },
    ultimaVisualizacaoAluno: {
        type: Date,
        default: null,
    },
    ultimaVisualizacaoProfessor: {
        type: Date,
        default: null,
    },
    cancelamento: {
        solicitadoPor: {
            type: String,
            default: null,
        },
        motivo: {
            type: String,
            default: null,
        },
        data: {
            type: Date,
            default: null,
        },
        resposta: {
            aceito: {
                type: Boolean,
                default: null,
            },
            motivo: {
                type: String,
                default: null,
            },
            data: {
                type: Date,
                default: null,
            },
        },
    },
});

export default model ("Orientacao", modelSchema);
