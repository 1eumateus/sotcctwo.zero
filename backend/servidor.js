import express from "express";
import cors from "cors";
import "./conectiondb.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import usuario from "./app/Usuario/Router.js";
import orientacao from "./app/Orientacao/Router.js";
import login from "./app/Login/Router.js";
import lotacao from "./app/Lotacao/Router.js";
import * as lembretePrazo from "./app/Orientacao/LembretePrazo.js";
import * as reuniaoAgendada from "./app/Orientacao/ReuniaoAgendada.js";

const __filename = fileURLToPath (import.meta.url);
const __dirname = path.dirname (__filename);

for (const pasta of ['uploads', 'temp']) {
    fs.mkdirSync (path.join (process.cwd (), pasta), { recursive: true });
}

const app = express ();
app.use (express.static (__dirname + '/public'));
app.use (cors ());
app.use (express.json ());
const port = process.env.port || 3007;
app.use ('/ui/', function (req, res, next) {
    res.redirect ('/ui/#' + req.url);
 })
app.use ('/api/v1/uploads', express.static (path.join (process.cwd (), 'uploads')));
app.use ('/api/v1/usuario', usuario);
app.use ("/api/v1/orientacao", orientacao);
app.use ("/api/v1/login", login);
app.use ("/api/v1/lotacao", lotacao);
app.use ('/', function (req, res, next) {
    res.redirect ('/ui/#' + req.url);
})

app.listen (port);
lembretePrazo.start ();
reuniaoAgendada.start ();
console.log ('port ' + port)
