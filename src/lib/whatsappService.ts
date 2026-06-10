import { supabase } from './supabaseClient';

interface SendDocumentWhatsappParams {
  to: string;
  nomeColaborador: string;
  mediaUrl: string;
  fileName: string;
  tipoArquivo?: 'xml' | 'pdf';
}

interface SendWhatsappResult {
  success: boolean;
  error?: string;
}

/**
 * Envia a mensagem com o documento em anexo via WhatsApp (Evolution API)
 * invocando a Supabase Edge Function 'send-document-whatsapp'.
 */
export async function sendDocumentWhatsapp(params: SendDocumentWhatsappParams): Promise<SendWhatsappResult> {
  let attempts = 0;
  const maxAttempts = 3;
  let lastError: string | undefined = undefined;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[WhatsApp] Tentativa de envio ${attempts}/${maxAttempts} para ${params.to}...`);

      const { data, error } = await supabase.functions.invoke('send-document-whatsapp', {
        body: params,
      });

      if (error) {
        console.warn(`[WhatsApp] Tentativa ${attempts} falhou com erro do Supabase:`, error);
        lastError = error.message || 'Falha ao invocar Edge Function do WhatsApp.';
      } else if (data?.error) {
        console.warn(`[WhatsApp] Tentativa ${attempts} falhou com erro de envio:`, data.error);
        lastError = data.error;
      } else {
        console.log(`[WhatsApp] ✓ Mensagem enviada com sucesso na tentativa ${attempts} para ${params.to}`);
        return { success: true };
      }
    } catch (err: any) {
      console.warn(`[WhatsApp] Tentativa ${attempts} capturou exceção:`, err);
      lastError = err.message || 'Erro inesperado ao enviar mensagem por WhatsApp.';
    }

    if (attempts < maxAttempts) {
      // Aguarda 1.5s antes de tentar novamente para resiliência de conexão
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  return { success: false, error: lastError || 'Falha ao enviar WhatsApp após múltiplas tentativas.' };
}
