import mongoose from "mongoose";
import "dotenv/config";
import { start as createUserAdmin } from "./seeds/createUserAdmin.js";
import { start as iniciarLembretePrazo } from "./app/Orientacao/LembretePrazo.js";
import { start as iniciarReuniaoAgendada } from "./app/Orientacao/ReuniaoAgendada.js";

mongoose.connect(process.env.DATABASE_URL).then(() => {
    console.log('Connected to MongoDB');
    createUserAdmin().catch(err => console.error('Erro ao criar usuário admin:', err));
    iniciarLembretePrazo();
    iniciarReuniaoAgendada();
}).catch(err => console.error('Error connecting to MongoDB:', err));