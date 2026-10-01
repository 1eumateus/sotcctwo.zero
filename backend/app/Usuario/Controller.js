import Model from "./Model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import mongoose from "mongoose";
import { v4 as uuidv4} from "uuid";
const { ObjectId } = mongoose.Types;
import fs from 'fs';
import { sendEmail } from '../shared/Mailer.js';
import {formatNome, formatTel, formatHtmlTags, filtrarTrabalhoFimCurso, filtrar} from '../shared/SigaaParser.js'
import {UnidadeModel, SubunidadeModel} from '../Lotacao/Model.js'

async function siape (req, res){
    try{
        let dados = null
        await axios.get (`https://sigaa.ufpa.br/sigaa/public/docente/portal.jsf?siape=${req.params.codigo}`)
            .then ((response) => {
                let perfil = filtrar (response.data);
                if (perfil.nome?.trim () && (perfil.nome?.trim () !== 'Docentes')) {
                    dados = {
                        nome: formatNome (formatHtmlTags(perfil.nome)),
                        formacao: formatHtmlTags (perfil.formacao),
                        interesse: formatHtmlTags (perfil.interesse),
                        email: formatHtmlTags (perfil.email),
                        lattes: formatHtmlTags (perfil.lattes),
                        telefone: formatTel (formatHtmlTags(perfil.telefone)),
                        descricao: formatHtmlTags (perfil.descricao)?.substring (0, 200),
                    }
                }
            })
        await axios.get (`https://sigaa.ufpa.br/sigaa/public/docente/producao.jsf?siape=${req.params.codigo}`)
            .then ((response) => {
                dados.trabalhosFimCurso = filtrarTrabalhoFimCurso (response.data)
            })
        if (!dados) {
            return res.status (400).json ({ msg: 'Nenhuma informação encontrada.'})
        }
        return res.status (200).json ({dados, msg: 'Dados encontradas.'})
    } catch (error) {
        console.log (error)
        return res.status (400).json ({msg: 'Erro ao consultar dados do siape.'})
    }
}

async function listar (req, res) {
    try {
        const token = req.headers.authorization;
        const filtro = {ativo: true, verificado: true}
        const {userID, userTipo } = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id, userTipo: usuario.tipo};
        });
        if (!userID) return res.status (400);

        if (userTipo !== 'admin') {
            return res.sendStatus (400);
        }
        const search = req.query.search || false;
        if (search) {
            filtro.$or = [
                { nome: { $regex: search, $options: "i" } },
                { sobrenome: { $regex: search, $options: "i" } }
            ];
        }
        const searchTipo = req.query.searchTipo || false;
        if (searchTipo) {
            filtro.$or = [
                { tipo: { $regex: searchTipo, $options: "i" } },
            ];
        }
        const item = await Model.aggregate ([
            { $match: filtro },  
            {
                $project: {    
                    _id: 1,       
                    nome: 1,
                    sobrenome: 1,
                    descricao: 1,
                    tipo: 1,
                    disponibilidade: 1,
                    interesse: 1,
                }
            }
        ]);
        res.status (200).json ({ item });
    } catch (error) {
        return res.sendStatus (400);
    }
}

async function listarProfessores (req, res) {
    try {
        const filtro = {ativo: true, verificado: true, tipo: 'professor',  disponibilidade: { $ne: 'indisponível' }}
        const procurar = req.query.procurar || false;
        const procurarDisponibilidade = req.query.procurarDisponibilidade || false;
        const procurarInteresse = req.query.procurarInteresse || false;
        if (procurar) {
            filtro.$or = [
                { nome: { $regex: procurar, $options: "i" } },
                { sobrenome: { $regex: procurar, $options: "i" } }
            ];
        }
        if (procurarDisponibilidade) {
            filtro.disponibilidade = { $regex: procurarDisponibilidade, $options: "i" } 
        }
        if (procurarInteresse) {
            filtro.interesse = { $regex: procurarInteresse, $options: "i" } 
        }
        const item = await Model.aggregate ([
            { $match: filtro },
            {
                $lookup: {
                    from: 'orientacaos',
                    let: { profId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $and: [
                            { $eq: ['$professor', '$$profId'] },
                            { $eq: ['$situacao', 'concluido'] },
                        ] } } },
                        { $count: 'total' },
                    ],
                    as: 'historicoConcluido',
                },
            },
            {
                $addFields: {
                    totalOrientados: { $ifNull: [{ $arrayElemAt: ['$historicoConcluido.total', 0] }, 0] },
                },
            },
            {
                $project: {
                    _id: 1,
                    nome: 1,
                    sobrenome: 1,
                    descricao: 1,
                    tipo: 1,
                    disponibilidade: 1,
                    interesse: 1,
                    imagem: 1,
                    formacao: 1,
                    email: 1,
                    totalOrientados: 1,
                }
            },
            {
                $sort: { nome: 1 }
            }
        ]);
        res.status (200).json ({ item });
    } catch (error) {
        return res.sendStatus (400);
    }
}

async function criar (req, res) {
    try {
        let novo = await Model.findOne ({ ativo: true, email: req.body.email });
        if (novo && novo.verificado) return res.status(400).json ({ msg: "Usuário já cadastrado." });
        if(req.body?.senha?.length < 6){
            return res.status (400).json ({ msg: "Senha inválida." });
        }
        const hashSenha = await bcrypt.hash (req.body?.senha, 10);
            if (!novo) {
            novo = new Model ({
                ativo: true,
                nome: req.body.nome,
                sobrenome: req.body.sobrenome,
                email: req.body.email,
                matricula: req.body.matricula,
                trabalhosFimCurso: req.body.trabalhosFimCurso,
                descricao: req.body.descricao,
                github: req.body.github,
                linkedin: req.body.linkedin,
                disponibilidade: req.body.disponibilidade,
                telefone: req.body.telefone,
                interesse: req.body.interesse,
                tipo: req.body.tipo,
                solicitacoes: req.body.solicitacoes,
                formacao: req.body.formacao,
                lattes: req.body.lattes,
                senha: hashSenha,
                subunidades: req.body.subunidades,
            });
        }
        else {
            novo.ativo = true;
            novo.nome = req.body.nome;
            novo.sobrenome = req.body.sobrenome;
            novo.email = req.body.email;
            novo.matricula = req.body.matricula,
            novo.trabalhosFimCurso = req.body.trabalhosFimCurso,
            novo.descricao = req.body.descricao;
            novo.github = req.body.github;
            novo.linkedin = req.body.linkedin;
            novo.disponibilidade = req.body.disponibilidade;
            novo.telefone = req.body.telefone;
            novo.interesse = req.body.interesse;
            novo.tipo = req.body.tipo;
            novo.formacao = req.body.formacao;
            novo.lattes = req.body.lattes;
            novo.senha = hashSenha;
            novo.subunidades = req.body.subunidades;
        }
        let err = await sendEmail (
            req.body.email,
            'SOTCC - Email de confirmação',
            `<h3>Confirme seu email para entrar no sistema.</h3><a href='${process.env.HOST_ROOT}/ui/login?user=${novo._id}'>Clique para confirmar email.</a>`);
        if (err == true) {
            return res.status (400).json ({ msg: "Erro ao enviar email de confirmação. Confere o endereço." })
        }
        await novo.save ();
        res.json ({ msg: 'Email de confirmação enviado.' });
    } catch (error) {
        console.log (error)
        return res.status (400).json ({ msg: "Erro 400." });
    }
}

async function editar (req, res) {
    try {
        let editar = await Model.findOne ({ ativo:true, verificado: true, _id: req.body._id });
        if (!editar) {
            return res.status (404).json ({ error: "Usuário não encontrado" });
        }
        let hashSenha = '';
        if (req.body.senha !== "") {
            hashSenha = await bcrypt.hash (req.body.senha, 10);
            editar.senha = hashSenha;
        }
        editar.nome = req.body.nome;
        editar.sobrenome = req.body.sobrenome;
        editar.email = req.body.email;
        editar.descricao = req.body.descricao;
        editar.github = req.body.github;
        editar.linkedin = req.body.linkedin;
        editar.disponibilidade = req.body.disponibilidade;
        editar.telefone = req.body.telefone;
        editar.instituicao = req.body.instituicao;
        editar.interesse = req.body.interesse;
        editar.tipo = req.body.tipo;
        editar.orientacoes = req.body.orientacoes;
        editar.formacao = req.body.formacao;
        editar.lattes = req.body.lattes;
        editar.trabalhosFimCurso = req.body.trabalhosFimCurso
        editar.subunidades = req.body.subunidades;
        editar.ativo = true;
        await editar.save ();
        res.status (200).json ({ msg: "Usuário editado com sucesso." });
    } catch (error) {
        return res.status (400);
    }
}

async function adicionarOrientacao (req, res) {
    try {
        let editar = await Model.findOne ({ ativo:true, verificado: true, _id: req.body.aluno });
        if (!editar) {
            return res.status (404).json ({ error: "Usuário não encontrado" });
        }
        editar.orientacoes.push (req.body.orientacao);
        await editar.save ();
        res.status (200).json ({ msg: "Pedido de orientação enviado. Verifique seu perfil." });
    } catch (error) {
        console.log (error);
        return res.status (400);
    }
}

async function deletar (req, res) {
    try {
        const usuario = await Model.findOne ({ ativo:true, _id: req.params.id });
        if (!usuario) {
            return res.status (404).json ({ error: "Usuário não encontrado" });
        }
        usuario.ativo = false;
        await usuario.save ();
        res.status (200);
    } catch (error) {
        return res.sendStatus (400);
    }
}

async function pegarPorId (req, res) {
    try {
        const token = req.headers.authorization;
        const filtro = { ativo: true, verificado: true, _id: new ObjectId (String (req.params.id)) };
        const { userID, userTipo } = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return { userID: usuario._id, userTipo: usuario.tipo };
        });
        if (!userID) return res.status (400);
        if (userTipo !== 'admin') {
            filtro.tipo = { $nin: ['admin'] };
        }
        const usuario = await Model.aggregate ([
            { $match: filtro },  
            {
                $project: {    
                    senha: 0,       
                }
            },
        ]);
        if (!usuario [0]) {
            return res.sendStatus (404);     
        }
        const subunidades = usuario [0].subunidades;
        const subunidadeNomes = [];
        const unidades = [];
        for (let i = 0; i < subunidades.length; i ++) {
            const s = subunidades [i];
            const subunidade = await SubunidadeModel.findById (s);
            const unidade = await UnidadeModel.findById (subunidade.unidade_id);
            unidades.push (unidade._id);
            subunidadeNomes.push ([unidade.unidade, subunidade.subunidade]);
        }
        usuario [0].subunidadesNomes = subunidadeNomes;
        usuario [0].unidades = unidades;
        res.json ({ usuario: usuario [0]});
    } catch (error) {
        console.log (error);
        return res.sendStatus (400); 
    }
}

async function adicionarImagem (req, res) {
    try {
        const token = req.headers.authorization;
        const { userID } = jwt.verify (token, process.env.JWT_SECRET, (err, usuario) => {
            if (err) return false;
            return {userID: usuario._id};
        });
        if (!userID) return res.status (400).json ({msg: 'Usuário não encontrado.'});
        let editar = await Model.findOne ({ ativo:true, verificado: true, _id: userID });
        if (!editar) return res.status (400).json ({msg: 'Usuário não encontrado.'});
        const file = req.file;
        if (!file) {
            const imagePath = editar?.imagem?.path; 
            if (fs.existsSync (imagePath)) {
                fs.unlinkSync (imagePath);
            }
            editar.imagem = null;
            await editar.save ();
            return res.status (200).json ({ msg: "Nenhum arquivo enviado." });
        }   
        if (editar?.imagem?.path) {
            const imagePath = editar?.imagem?.path; 
            if (fs.existsSync (imagePath)) {
                fs.unlinkSync (imagePath);
            }
        }
        editar.imagem = file;
        await editar.save ();
        res.status (200).json ();
    } catch (error) {
        console.log (error);
        return res.status (400).json ({ msg: "Erro ao salvar imagem." });
    }
}

async function recuperarSenhaSolicitacao (req, res) {
    try{
        let user = await Model.findOne ({ ativo: true, email: req.body.email });
        if(!user) return res.status (404).json ({msg: 'Endereço não cadastrado no sistema.'});
        let codigo = uuidv4 ();
        user.codigo_recuperacao = codigo;
        user.save ();
        let err = await sendEmail (
            req.body.email, 
            'SOTCC - Recuperação de senha',
            `<h3>Clique no link seguinte para redefinir a sua senha.</h3><a href='${process.env.HOST_ROOT}/ui/redefinir/${codigo}/'>Clique para confirmar email.</a>`);
        if (err == false) return res.json ({msg: 'Email de recuperação enviado com sucesso.'});
        else return res.status(400).json ({ msg: "Erro ao enviar email de recuperação. Confere o endereço." })
    } catch (error) {
        console.log (error);
        return res.sendStatus (400).json ({ 
            msg: error 
        })
    }
}

async function redefinirSenha (req, res) {
    try{
        const idUser = req.body._id
        if (!idUser) return res.status (400).json ({msg:'ID do usuário não informado.'});
        const user = await Model.findOne ({ codigo_recuperacao: idUser });
        if (!user) return res.status (400).json ({msg: 'O usuário não existe.'});
        user.verificado = true;
        user.senha = await bcrypt.hash (req.body?.senha, 10);
        await user.save ()
        const token = jwt.sign (
            {
                _id: user._id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
            },
            process.env.JWT_SECRET
        );
        return res.json ({ token });
    } catch (error) {
        return res.sendStatus (400).json ({msg: error});
    }
}

export { listar, listarProfessores, siape, adicionarOrientacao, adicionarImagem, criar, deletar, editar, pegarPorId, recuperarSenhaSolicitacao, redefinirSenha};