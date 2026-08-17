export function detectStage(message: string): string | null {
  const lower = message.toLowerCase();

  if (
    lower.includes("iniciando finalização") ||
    lower.includes("pipeline concluído") ||
    lower.includes("post pronto") ||
    lower.includes("post atualizado: approved")
  ) {
    return "finalize";
  }

  if (
    lower.includes("enviando conteúdo para avaliação") ||
    lower.includes("resultado da revisão") ||
    lower.includes("salvando avaliação") ||
    lower.includes("review salva") ||
    lower.includes("score geral") ||
    lower.includes("quality control") ||
    lower.includes("content review") ||
    lower.includes("post não aprovado") ||
    lower.includes("needs_revision")
  ) {
    return "review";
  }

  if (
    lower.includes("salvando caminhos das imagens") ||
    lower.includes("imagem armazenada no minio") ||
    lower.includes("minio") ||
    lower.includes("object key") ||
    lower.includes("slide atualizado")
  ) {
    return "storage";
  }

  if (
    lower.includes("gerando imagens") ||
    lower.includes("gerando slide") ||
    lower.includes("cloudflare") ||
    lower.includes("sharp") ||
    lower.includes("imagens geradas") ||
    lower.includes("image generator")
  ) {
    return "images";
  }

  if (
    lower.includes("salvando no postgresql") ||
    lower.includes("post salvo:")
  ) {
    return "database";
  }

  if (
    lower.includes("gerando conteúdo") ||
    lower.includes("conteúdo gerado") ||
    lower.includes("content generator") ||
    lower.includes("hashtags:")
  ) {
    return "content";
  }

  if (
    lower.includes("consultando histórico") ||
    lower.includes("analisando próxima publicação") ||
    lower.includes("decisão do gestor") ||
    lower.includes("content strategist") ||
    lower.includes("social media agent")
  ) {
    return "strategy";
  }

  return null;
}

export function isStageCompleted(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("posts no histórico") ||
    lower.includes("decisão do gestor") ||
    lower.includes("conteúdo gerado") ||
    lower.includes("post salvo:") ||
    lower.includes("geração de imagens concluída") ||
    lower.includes("imagens geradas:") ||
    lower.includes("review salva:") ||
    lower.includes("post atualizado: approved") ||
    lower.includes("pipeline concluído") ||
    lower.includes("post pronto para agendamento")
  );
}

export function extractProgress(message: string): string | undefined {
  const match = message.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return undefined;
  return `${match[1]}/${match[2]}`;
}
