/**
 * @title Cloudflare AI Recraft Image Test
 * @description Testa a autenticação e geração de imagem 1080x1350 via Cloudflare AI Gateway (Recraft v4).
 * @category Imagens & Visual
 */
import "dotenv/config";
import { generateCloudflareImage } from "../integrations/cloudflare/recraft.js";

async function main() {
  console.log("=========================================");
  console.log("🎨 TESTANDO CLOUDFLARE AI (RECRAFT V4)");
  console.log("=========================================\n");

  console.log("Enviando prompt de teste para a Cloudflare...");
  const buffer = await generateCloudflareImage({
    prompt: "A minimalist modern software development terminal displaying clean TypeScript code with dark background and vibrant cyan syntax highlighting",
    size: "896x1152",
  });

  console.log(`\n✅ SUCESSO TOTAL!`);
  console.log(`📦 Imagem gerada e processada no Sharp: ${(buffer.length / 1024).toFixed(1)} KB (1080x1350 PNG)`);
  console.log("=========================================");
}

main().catch((err) => {
  console.error("\n❌ ERRO NA CLOUDFLARE:", err.message);
  process.exit(1);
});
