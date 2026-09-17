
import Usuario from "../app/Usuario/Model.js";
import bcrypt from "bcryptjs";
import {UnidadeModel, SubunidadeModel} from '../app/Lotacao/Model.js'

export async function start() {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_SENHA) {
        console.warn('Aviso: ADMIN_EMAIL/ADMIN_SENHA não definidos no .env — criação do usuário admin ignorada.');
        return;
    }

    let isNew = await Usuario.findOne({ email: process.env.ADMIN_EMAIL });
    if (!isNew) {
        const novo = new Usuario({
            nome: 'Admin',
            email: process.env.ADMIN_EMAIL,
            tipo: 'admin',
            ativo: true,
            verificado: true,
            senha: await bcrypt.hash(process.env.ADMIN_SENHA, 10),
        });
        await novo.save();
        let unidade = new UnidadeModel({
            unidade: 'CAMTUC',
            cidade: 'Tucuruí'
        });
        await unidade.save();
        let subunidade = new SubunidadeModel({
            subunidade: 'FECOMP',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FEE',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FAESA',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FEC',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FF',
            unidade_id: unidade._id
        });
        await subunidade.save();

        unidade = new UnidadeModel({
            unidade: 'CUNTINS',
            cidade: 'Cametá'
        });
        await unidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FAGRO',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FACIN',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FAED',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FECAMPO',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FAGEO',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FACH',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FAL',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FAMAT',
            unidade_id: unidade._id
        });
        await subunidade.save();
        subunidade = new SubunidadeModel({
            subunidade: 'FSI',
            unidade_id: unidade._id
        });
        await subunidade.save();
    }
}
