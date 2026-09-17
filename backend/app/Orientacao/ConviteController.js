import PDFDocument from 'pdfkit';
import axios from "axios";
import { pipeline } from 'stream';
import fs from 'fs';

async function gerarConvite (req, res) {
    try {
        const form = req.body;
        const doc = new PDFDocument ({
            size: 'A4',
            margin: 20
        });
        res.setHeader ('Content-Type', 'application/pdf');
        res.setHeader ('Content-Disposition', 'attachment; filename=convite.pdf');
        const pathFundo = 'public/fundoCartaz.jpg';
        doc.image (pathFundo, 0, 0, { width: doc.page.width, height: doc.page.height });
        doc.moveDown ();
        for (let i = 0; i < 15; i ++) {
            doc.moveDown ();
        }
        doc.fontSize (16).text ('UNIVERSIDADE FEDERAL DO PARÁ', { align: 'center', lineGap: 8 });
        doc.text ('CAMPUS UNIVERSITÁRIO DE TUCURUÍ', { align: 'center', lineGap: 8 });
        doc.text ('FACULDADE DE ENGENHARIA DE COMPUTAÇÃO', { align: 'center', lineGap: 8 });
        doc.moveDown ();
        doc.moveDown ();
        doc.fontSize (16).text (`${form.tema}`, { align: 'center' });
        doc.fontSize (16).text (`${form.aluno.nome} ${form.aluno.sobrenome}${form.aluno.instituicao ? ` (${form.aluno.instituicao})` : ''}`, { align: 'center' });
        doc.moveDown ();
        doc.moveDown ();
        doc.fontSize (16).text (`BANCA EXAMINADORA:`, { align: 'center', lineGap: 4 });
        doc.fontSize (16).text (`${form.professor.nome} ${form.professor.sobrenome} (UFPA/FECOMP)`, { align: 'center' });
        doc.fontSize (16).text (`Orientador`, { align: 'center' });
        if (form.coorientador.nome) {
            doc.moveDown ();
            doc.fontSize (16).text (`${form.coorientador.nome?.trim()} ${form.coorientador.instituicao ? `(${form.coorientador.instituicao})` : ''}`, { align: 'center' });
            doc.fontSize (16).text (`Coorientador`, { align: 'center' });
        }
        form.banca.forEach ((membro) => {
            doc.moveDown ();
            doc.fontSize (16).text (`${membro.nome?.trim()} ${membro.instituicao ? `(${membro.instituicao?.trim()})` : ''}`, { align: 'center' });
            doc.fontSize (16).text (`Examinador`, { align: 'center' });
        });
        doc.moveDown ();
        doc.moveDown ();
        doc.moveDown ();
        doc.fontSize (16).text (`DATA E HORA: (${formatarData(form.dataDefesa)} às ${form.horaDefesa})`, { align: 'left' });
        if (form.presencial && form.local?.trim ()){
            doc.moveDown ();
            doc.fontSize (16).text (`LOCAL: ${form.local}`, { align: 'left', lineGap: 8 });
        }
        if (form.link?.trim () && !form.presencial) {
            const qrCodeResponse = await axios.get (`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(form.link)}`, { responseType: 'arraybuffer' });
            const qrCodeBuffer = Buffer.from (qrCodeResponse.data, 'binary');
            const qrCodePath = 'temp/qrcode.png';
            fs.writeFileSync (qrCodePath, qrCodeBuffer);
            const qrCodeWidth = 100;
            const qrCodeHeight = 100;
            doc.moveDown ();
            doc.fontSize (16).text (`LOCAL VIRTUAL: ${form.link}`, { align: 'left', lineGap: 8 });
            doc.fontSize (16).text (`Acesse também pelo QRCode`, { align: 'left', lineGap: 8 });
            doc.image (qrCodePath, doc.page.width - qrCodeWidth - doc.page.margins.right, doc.y - qrCodeHeight, { width: qrCodeWidth, height: qrCodeHeight });
        }
        doc.end ();
        pipeline (doc, res, (err) => {
            if (err) {
                console.error ('Erro ao gerar o PDF:', err);
                return res.status (500).json ({ msg: "Erro ao gerar convite." });
            }
            console.log ("Cartaz gerado com sucesso.");
        });
    } catch (error) {
        console.error ('error:', error);
        return res.status (400).json ({ msg: "Erro ao gerar convite." });
    }
}

function formatarData (value) {
    if (!value) return '';
    const data = new Date (value);
    const ano = data.getUTCFullYear ();
    const mes = String (data.getUTCMonth () + 1).padStart (2, '0');
    const dia = String (data.getUTCDate ()).padStart (2, '0');
    return `${dia}/${mes}/${ano}`;
}

export { gerarConvite };
