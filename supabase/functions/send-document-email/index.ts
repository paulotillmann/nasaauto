import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_secure: string;
}

interface EmailPayload {
  to: string;
  nomeColaborador: string;
  tipoDocumento: 'holerite' | 'informe';
  periodoReferencia: string;
  cpf: string;
  pdfUrl: string;
  isTest?: boolean;
  nomeEmpresa?: string;
  logoUrl?: string;
  nomeArquivo?: string;
  tipoArquivo?: 'xml' | 'pdf';
}

// ---------- Busca config SMTP da tabela app_settings ----------
async function getSmtpConfig(): Promise<SmtpConfig> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .like('key', 'smtp_%');

  if (error) throw new Error(`Erro ao ler configurações SMTP: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Configurações SMTP não encontradas. Configure em Configurações > Servidor SMTP.');

  const config: Record<string, string> = {};
  for (const row of data) config[row.key] = row.value;

  if (!config.smtp_host || !config.smtp_port || !config.smtp_user || !config.smtp_pass) {
    throw new Error('Configurações SMTP incompletas. Verifique host, porta, usuário e senha.');
  }
  return config as unknown as SmtpConfig;
}

// ---------- Encoder/Decoder helpers ----------
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function sendEmailViaSMTP(
  smtp: SmtpConfig,
  to: string,
  subject: string,
  html: string,
  payload: EmailPayload
): Promise<void> {
  const port = parseInt(smtp.smtp_port, 10);
  const useDirectTLS = smtp.smtp_secure === 'ssl' || port === 465;

  console.log(`[SMTP] Connecting to ${smtp.smtp_host}:${port} (${useDirectTLS ? 'direct TLS' : 'STARTTLS'})`);

  let conn: Deno.TcpConn | Deno.TlsConn;
  if (useDirectTLS) {
    conn = await Deno.connectTls({ hostname: smtp.smtp_host, port });
  } else {
    conn = await Deno.connect({ hostname: smtp.smtp_host, port });
  }

  let reader = conn.readable.getReader();
  let writer = conn.writable.getWriter();
  let smtpBuffer = '';

  async function readSMTPResponse(): Promise<string> {
    const lines: string[] = [];
    while (true) {
      let newlineIdx = smtpBuffer.indexOf('\r\n');
      while (newlineIdx !== -1) {
        const line = smtpBuffer.substring(0, newlineIdx);
        smtpBuffer = smtpBuffer.substring(newlineIdx + 2);
        lines.push(line);
        
        // Verifica se é uma resposta SMTP multilinha (ex: 250-...)
        const isMultilineContinuation = /^\d{3}-/.test(line);
        if (!isMultilineContinuation) {
          return lines.join('\r\n');
        }
        newlineIdx = smtpBuffer.indexOf('\r\n');
      }
      
      const { value, done } = await reader.read();
      if (value) {
        smtpBuffer += decoder.decode(value, { stream: !done });
      }
      if (done) {
        if (lines.length > 0 || smtpBuffer.length > 0) {
          return (lines.join('\r\n') + '\r\n' + smtpBuffer).trim();
        }
        throw new Error("Conexão SMTP fechada inesperadamente pelo servidor.");
      }
    }
  }

  async function sendCommand(command: string): Promise<string> {
    await writer.write(encoder.encode(command + '\r\n'));
    return await readSMTPResponse();
  }

  const greeting = await readSMTPResponse();
  if (!greeting.startsWith('220')) throw new Error(`SMTP greeting failed: ${greeting}`);

  let ehlo = await sendCommand(`EHLO edge-function.supabase.co`);

  if (!useDirectTLS && (smtp.smtp_secure === 'tls' || ehlo.includes('STARTTLS'))) {
    const starttls = await sendCommand('STARTTLS');
    if (!starttls.startsWith('220')) throw new Error(`STARTTLS failed: ${starttls}`);
    
    reader.releaseLock();
    writer.releaseLock();
    
    conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: smtp.smtp_host });
    reader = conn.readable.getReader();
    writer = conn.writable.getWriter();
    smtpBuffer = ''; // Reseta o buffer pós-TLS upgrade

    ehlo = await sendCommand(`EHLO edge-function.supabase.co`);
  }

  const authResp = await sendCommand('AUTH LOGIN');
  if (!authResp.startsWith('334')) throw new Error(`AUTH LOGIN failed: ${authResp}`);

  const userResp = await sendCommand(btoa(smtp.smtp_user));
  if (!userResp.startsWith('334')) throw new Error(`AUTH user failed: ${userResp}`);

  const passResp = await sendCommand(btoa(smtp.smtp_pass));
  if (!passResp.startsWith('235')) throw new Error(`AUTH password failed: ${passResp}`);

  const fromResp = await sendCommand(`MAIL FROM:<${smtp.smtp_from_email}>`);
  if (!fromResp.startsWith('250')) throw new Error(`MAIL FROM failed: ${fromResp}`);

  const rcptResp = await sendCommand(`RCPT TO:<${to}>`);
  if (!rcptResp.startsWith('250')) throw new Error(`RCPT TO failed: ${rcptResp}`);

  const dataResp = await sendCommand('DATA');
  if (!dataResp.startsWith('354')) throw new Error(`DATA failed: ${dataResp}`);

  // Preparar o anexo se houver URL válida
  let attachmentBase64 = '';
  let attachmentFilename = payload.nomeArquivo || 'documento';
  let attachmentMime = 'application/octet-stream';

  if (payload.pdfUrl && !payload.isTest) {
    try {
      console.log(`[SMTP] Baixando anexo de: ${payload.pdfUrl}`);
      const fileResp = await fetch(payload.pdfUrl);
      if (!fileResp.ok) {
        throw new Error(`Falha ao baixar arquivo para anexo: Status ${fileResp.status}`);
      }
      const fileBuffer = await fileResp.arrayBuffer();
      const bytes = new Uint8Array(fileBuffer);
      
      // Conversão chunked de bytes para string binária (evita estouro de pilha para arquivos grandes)
      let binary = "";
      const len = bytes.byteLength;
      const chunk = 8192;
      for (let i = 0; i < len; i += chunk) {
        const slice = bytes.subarray(i, i + chunk);
        binary += String.fromCharCode.apply(null, slice as any);
      }
      attachmentBase64 = btoa(binary);

      if (payload.tipoArquivo === 'xml') {
        attachmentMime = 'application/xml';
        if (!attachmentFilename.toLowerCase().endsWith('.xml')) {
          attachmentFilename += '.xml';
        }
      } else if (payload.tipoArquivo === 'pdf') {
        attachmentMime = 'application/pdf';
        if (!attachmentFilename.toLowerCase().endsWith('.pdf')) {
          attachmentFilename += '.pdf';
        }
      } else {
        const lowerName = attachmentFilename.toLowerCase();
        if (lowerName.endsWith('.xml')) attachmentMime = 'application/xml';
        else if (lowerName.endsWith('.pdf')) attachmentMime = 'application/pdf';
      }
      console.log(`[SMTP] Anexo baixado com sucesso: ${attachmentFilename} (${attachmentMime}, ${bytes.byteLength} bytes)`);
    } catch (err) {
      console.error(`[SMTP] Erro ao baixar ou codificar o anexo:`, err);
      throw new Error(`Não foi possível anexar o arquivo ao e-mail: ${err.message}`);
    }
  }

  const nowStr = new Date().toUTCString();
  const messageParts: string[] = [];

  if (attachmentBase64) {
    const mixedBoundary = `mixed_${Date.now()}`;
    const altBoundary = `alt_${Date.now()}`;

    messageParts.push(
      `From: ${smtp.smtp_from_name} <${smtp.smtp_from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      `Date: ${nowStr}`,
      ``,
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(html))),
      ``,
      `--${altBoundary}--`,
      ``,
      `--${mixedBoundary}`,
      `Content-Type: ${attachmentMime}; name="${attachmentFilename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${attachmentFilename}"`,
      ``,
      attachmentBase64.replace(/(.{76})/g, "$1\r\n"),
      ``,
      `--${mixedBoundary}--`,
      `.`
    );
  } else {
    const boundary = `boundary_${Date.now()}`;
    messageParts.push(
      `From: ${smtp.smtp_from_name} <${smtp.smtp_from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${nowStr}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(html))),
      ``,
      `--${boundary}--`,
      `.`
    );
  }

  const message = messageParts.join('\r\n');

  const endResp = await sendCommand(message);
  if (!endResp.startsWith('250')) throw new Error(`Send failed: ${endResp}`);

  await sendCommand('QUIT');

  try {
    reader.releaseLock();
    writer.releaseLock();
    conn.close();
  } catch { /* ignore cleanup errors */ }
}

// ---------- Monta o HTML do e-mail ----------
function buildEmailHtml(payload: EmailPayload): string {
  const nomeEmpresa = payload.nomeEmpresa || 'NASA AUTO PEÇAS';
  const logoHtml = `<h1 style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1.5px;margin:0;text-align:center;font-family:'Segoe UI',Roboto,Arial,sans-serif;text-transform:uppercase;">NASA AUTO PEÇAS</h1>`;

  if (payload.isTest) {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Roboto,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);"><tr><td style="background:#0f172a;padding:32px;text-align:center;">${logoHtml}</td></tr><tr><td style="background:#ffffff;padding:36px 32px;"><h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;font-weight:700;">✅ Teste de SMTP bem-sucedido!</h2><p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Este e-mail confirma que as configurações de SMTP do sistema ${nomeEmpresa} estão funcionando corretamente.</p><p style="margin:0;color:#94a3b8;font-size:13px;">Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p></td></tr><tr><td style="background:#ffffff;padding:16px 32px 28px;border-radius:0 0 12px 12px;"><p style="margin:0;color:#cbd5e1;font-size:11px;text-align:center;">Sistema de Gestão ${nomeEmpresa}</p></td></tr></table></td></tr></table></body></html>`;
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Roboto,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);"><tr><td style="background:#0f172a;padding:32px;text-align:center;">${logoHtml}</td></tr><tr><td style="background:#ffffff;padding:36px 32px 36px;"><h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">Olá, ${payload.nomeColaborador}! 👋</h2><p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">Em nome da empresa <strong>${nomeEmpresa}</strong>, gostaríamos de expressar nossa sincera gratidão pela nossa parceria. Seu comprometimento é fundamental para continuarmos crescendo juntos.</p><p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">O seu documento já está disponível e foi enviado em **anexo** neste e-mail. Por favor, verifique o arquivo anexo para visualizá-lo ou salvá-lo.</p></td></tr><tr><td style="background:#ffffff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr><tr><td style="background:#ffffff;padding:24px 32px 28px;border-radius:0 0 12px 12px;"><p style="margin:0 0 6px;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">${nomeEmpresa}</p><p style="margin:0;color:#cbd5e1;font-size:11px;text-align:center;line-height:1.5;">Este é um e-mail automático enviado pelo sistema de gestão da empresa.<br/>Em caso de dúvidas, entre em contato com a administração.</p></td></tr></table></td></tr></table></body></html>`;
}

// ---------- Handler principal ----------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const payload: EmailPayload = await req.json();
    if (!payload.to || !payload.nomeColaborador) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: to, nomeColaborador' }), { status: 400, headers: corsHeaders });
    }

    const smtp = await getSmtpConfig();
    const nomeEmpresa = payload.nomeEmpresa || 'NASA AUTO PEÇAS';
    const subject = payload.isTest
      ? `Teste de SMTP - ${nomeEmpresa}`
      : `Documento XML/PDF - NASA AUTO PEÇAS`;
    const html = buildEmailHtml(payload);

    // Tenta enviar o e-mail via SMTP com até 3 tentativas (resiliência contra oscilações de rede)
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[SMTP] Tentativa de envio ${attempts}/${maxAttempts} para ${payload.to}...`);
        await sendEmailViaSMTP(smtp, payload.to, subject, html, payload);
        lastError = null;
        console.log(`[SMTP] E-mail enviado com sucesso na tentativa ${attempts}!`);
        break;
      } catch (err) {
        console.error(`[SMTP] Tentativa ${attempts} falhou:`, err);
        lastError = err;
        if (attempts < maxAttempts) {
          // Aguarda 1.5 segundos antes de tentar novamente
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err) {
    console.error('[SMTP] Erro:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao enviar e-mail.';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
