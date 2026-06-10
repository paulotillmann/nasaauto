import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface WhatsappPayload {
  to: string;
  nomeColaborador: string;
  mediaUrl: string;
  fileName: string;
  tipoArquivo?: 'xml' | 'pdf';
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const payload: WhatsappPayload = await req.json();
    const { to, nomeColaborador, mediaUrl, fileName, tipoArquivo } = payload;

    if (!to || !nomeColaborador || !mediaUrl || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: to, nomeColaborador, mediaUrl, fileName' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Obter configurações da Evolution API das variáveis de ambiente
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_BASE_URL = Deno.env.get('EVOLUTION_BASE_URL') || 'https://evolution.technocode.site';
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || 'MeuBolso digital';

    if (!EVOLUTION_API_KEY) {
      console.error('[WhatsApp] EVOLUTION_API_KEY não configurada nas variáveis de ambiente.');
      return new Response(
        JSON.stringify({ error: 'Configuração do WhatsApp incompleta no servidor (EVOLUTION_API_KEY ausente).' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Tratar e formatar número do WhatsApp (Padrão Brasil)
    let cleanNumber = to.replace(/\D/g, '');
    
    // Se o número for nacional (DDD + número) sem o DDI 55
    if (cleanNumber.length === 10 || cleanNumber.length === 11) {
      cleanNumber = '55' + cleanNumber;
    } else if (cleanNumber.length > 11 && !cleanNumber.startsWith('55') && cleanNumber.length < 14) {
      // Caso tenha algum outro formato, tenta apenas garantir o DDI se necessário
      cleanNumber = '55' + cleanNumber.substring(cleanNumber.length - 11);
    }

    console.log(`[WhatsApp] Preparando envio para o número: ${cleanNumber}`);

    // 3. Montar a mensagem padrão da NASA AUTO PEÇAS
    const messageText = `Olá, ${nomeColaborador},
Em nome da empresa NASA AUTO PEÇAS, gostaríamos de expressar nossa sincera gratidão pela nossa parceria. Seu comprometimento é fundamental para continuarmos crescendo juntos.
O seu documento já está disponível e foi enviado em **anexo** nesta mensagem. Por favor, verifique o arquivo anexo para visualizá-lo ou salvá-lo.`;

    // 4. Identificar o MimeType
    let mimetype = 'application/octet-stream';
    const lowerName = fileName.toLowerCase();
    if (tipoArquivo === 'xml' || lowerName.endsWith('.xml')) {
      mimetype = 'application/xml';
    } else if (tipoArquivo === 'pdf' || lowerName.endsWith('.pdf')) {
      mimetype = 'application/pdf';
    }

    // 5. Configurar a chamada para a Evolution API
    const targetUrl = `${EVOLUTION_BASE_URL.replace(/\/$/, '')}/message/sendMedia/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    
    const requestBody = {
      number: cleanNumber,
      mediatype: 'document',
      mimetype: mimetype,
      caption: messageText,
      media: mediaUrl,
      fileName: fileName
    };

    console.log(`[WhatsApp] Enviando requisição para a Evolution API: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log(`[WhatsApp] Status de resposta: ${response.status}. Detalhes: ${responseText}`);

    if (!response.ok) {
      throw new Error(`Falha no envio via Evolution API: ${response.status} - ${responseText}`);
    }

    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: corsHeaders }
    );

  } catch (err: any) {
    console.error('[WhatsApp] Erro durante o processo de envio:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro inesperado ao enviar mensagem por WhatsApp.' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
