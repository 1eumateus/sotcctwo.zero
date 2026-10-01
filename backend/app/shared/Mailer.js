import nodemailer from 'nodemailer'

// Estilos inline: a maioria dos clientes de email ignora <style>.
function template (content) {
    const corpo = content
        .replace (/<h3>/g, '<h3 style="margin:0 0 12px;font-size:18px;color:#3d4a7b;">')
        .replace (/<p>/g, '<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#333333;">')
        .replace (/<a /g, '<a style="display:inline-block;margin-top:8px;padding:10px 20px;background:#d99c44;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;" ');
    return `<div style="background:#e9e9e9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
<div style="background:#3d4a7b;padding:16px 24px;color:#ffffff;font-size:20px;font-weight:bold;">SOTCC</div>
<div style="padding:24px;">${corpo}</div>
<div style="padding:12px 24px;background:#c8d5ec;font-size:12px;color:#2f3a60;">Este é um email automático do SOTCC. Não responda.</div>
</div>
</div>`;
}

async function sendEmail (dest,subject,content) {
    const transport = nodemailer.createTransport ({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth:{
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_SENHA,
        },
        connectionTimeout: 20000
    })
    let err = false;
    await transport.sendMail ({
        from: `SOTCC <${process.env.SMTP_EMAIL}>`,
        to: dest,
        subject: subject,
        html: template (content),
        text: content.replace (/<a [^>]*href='([^']*)'[^>]*>(.*?)<\/a>/g, '$2: $1').replace (/<[^>]+>/g, '\n').replace (/\n+/g, '\n').trim (),
    }).then (() => err = false)
      .catch ((erro) => {
        console.log (erro);
        err = true
      })
    transport.close ();
    return err;
}

export { sendEmail }