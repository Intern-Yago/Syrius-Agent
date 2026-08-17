/**
 * @title Gerador de Prompts de Imagem (Recraft)
 * @description Testa a engenharia de prompts visuais para o Recraft v4 com base na direção visual e texto do slide.
 * @category Imagens & Visual
 */

export const testInfo = {
  title: "Gerador de Prompts de Imagem (Recraft)",
  description: "Testa a engenharia de prompts visuais para o Recraft v4 com base na direção visual e texto do slide.",
  category: "Imagens & Visual",
};

import "dotenv/config";
import { buildImagePrompt } from "../services/image-prompt-builder.js";
import type { GeneratedSlide } from "../services/content-generator.js";

const slide: GeneratedSlide = {
  number: 4,
  title: "O famoso comando Squash",
  text: "Ao rodar o rebase, um editor abrirá. Mantenha pick no primeiro commit e use squash nos seguintes.",
  visualDirection:
    "Mockup realista de um editor de texto de terminal. Destaque visual na palavra pick na primeira linha e squash nas linhas subsequentes. Setas indicativas conectando as linhas para mostrar a fusão.",
};

const result = buildImagePrompt(slide, 8);

console.log("\n==============================");
console.log("PROMPT GERADO");
console.log("==============================\n");

console.log(result.prompt);

console.log("\n==============================");
console.log("CONFIGURAÇÃO");
console.log("==============================\n");

console.log("Dimensões:", result.size);
console.log("\n✅ Teste de Image Prompt concluído com sucesso!");