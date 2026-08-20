/**
 * Minificador de Prompts:
 * Reduz em 15% a 25% o volume de tokens de entrada eliminando espaços duplicados,
 * indentações excessivas e linhas vazias redundantes, preservando a semântica e blocos de código.
 */
export function minifyPromptText(prompt: string): string {
  if (!prompt || typeof prompt !== "string") return "";

  const lines = prompt.split("\n");
  const processedLines: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      processedLines.push(trimmed);
      continue;
    }

    if (inCodeBlock) {
      // Dentro de blocos de código ou JSON preserva formatação essencial
      processedLines.push(rawLine);
      continue;
    }

    // Fora de blocos de código: remove linhas vazias consecutivas
    if (!trimmed) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== "") {
        processedLines.push("");
      }
      continue;
    }

    // Reduz múltiplos espaços internos para um único espaço
    const compressed = trimmed.replace(/[ \t]{2,}/g, " ");
    processedLines.push(compressed);
  }

  return processedLines.join("\n").trim();
}
