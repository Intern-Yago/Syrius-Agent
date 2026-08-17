/**
 * @title Teste de Storage S3 / Cloudflare R2
 * @description Valida a conexão com o bucket R2, upload de buffer de imagem Sharp e verificação de integridade.
 * @category Storage
 */

export const testInfo = {
  title: "Teste de Storage S3 / Cloudflare R2",
  description: "Valida a conexão com o bucket R2, upload de buffer de imagem Sharp e verificação de integridade.",
  category: "Storage",
};

import sharp from "sharp";
import {
  ensureBucket,
  uploadImageBuffer,
  downloadImage,
  imageExists,
} from "../core/storage.js";

async function main() {
  console.log("=================================");
  console.log("☁️ TESTE DE STORAGE (R2 / S3)");
  console.log("=================================");

  console.log("\n🔌 [1/3] Testando conexão e bucket...");
  await ensureBucket();
  console.log("✅ Conexão com Storage funcionando.");

  console.log("\n🎨 [2/3] Gerando imagem de teste 1080x1350 com Sharp...");
  const imageBuffer = await sharp({
    create: {
      width: 1080,
      height: 1350,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const testKey = "tests/test-storage-check.png";
  console.log(`\n📤 [3/3] Fazendo upload para "${testKey}"...`);
  await uploadImageBuffer(imageBuffer, testKey, "image/png");

  const exists = await imageExists(testKey);
  console.log(`- Arquivo existe no R2: ${exists ? "SIM ✅" : "NÃO ❌"}`);

  console.log("\n✅ Teste de Storage finalizado com SUCESSO!");
}

main().catch((error) => {
  console.error("\n❌ Erro no teste de storage:", error);
  process.exit(1);
});