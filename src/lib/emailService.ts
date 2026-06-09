import { supabase } from './supabaseClient';

interface SendDocumentEmailParams {
  to: string;
  nomeColaborador: string;
  tipoDocumento: 'holerite' | 'informe';
  periodoReferencia: string;
  cpf: string;
  pdfUrl: string;
  nomeEmpresa?: string;
  logoUrl?: string;
  nomeArquivo?: string;
  tipoArquivo?: 'xml' | 'pdf';
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Envia o e-mail com o documento para o cliente via Supabase Edge Function.
 */
export async function sendDocumentEmail(params: SendDocumentEmailParams): Promise<SendEmailResult> {
  let attempts = 0;
  const maxAttempts = 3;
  let lastError: string | undefined = undefined;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[Email] Tentativa de envio ${attempts}/${maxAttempts} para ${params.to}...`);

      const { data, error } = await supabase.functions.invoke('send-document-email', {
        body: params,
      });

      if (error) {
        console.warn(`[Email] Tentativa ${attempts} falhou com erro:`, error);
        lastError = error.message || 'Falha ao enviar e-mail.';
      } else if (data?.error) {
        console.warn(`[Email] Tentativa ${attempts} falhou com erro de envio:`, data.error);
        lastError = data.error;
      } else {
        console.log(`[Email] ✓ E-mail enviado com sucesso na tentativa ${attempts} para ${params.to}`);
        return { success: true };
      }
    } catch (err: any) {
      console.warn(`[Email] Tentativa ${attempts} capturou exceção:`, err);
      lastError = err.message || 'Erro inesperado ao enviar e-mail.';
    }

    if (attempts < maxAttempts) {
      // Aguarda 1.5s antes de tentar novamente para resiliência de conexão
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  return { success: false, error: lastError || 'Falha ao enviar e-mail após múltiplas tentativas.' };
}
