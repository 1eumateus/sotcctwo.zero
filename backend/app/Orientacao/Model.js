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
    // sala da defesa - fixa, atrelada ao cartaz (link público). Nunca muda de id.
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
    // true assim que o cartaz é gerado pela 1ª vez - a partir daí o botão de
    // reunião vira "Sala de defesa" e passa a usar a sala fixa (chamadaAoVivo),
    // nunca mais a sala avulsa - o link do cartaz não pode ficar obsoleto.
    cartazGerado: {
        type: Boolean,
        default: false,
    },
    // sala de reunião avulsa do orientador com o aluno - o professor gera uma
    // sala nova (salaId novo) toda vez que clica em "Criar reunião".
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
        // quando setado (e ativa ainda false), é uma reunião marcada pra
        // depois - um job liga "ativa" sozinho na hora certa (ReuniaoAgendada.js).
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
