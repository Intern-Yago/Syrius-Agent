/**
 * @title Cloudflare R2 Storage
 * @description Testa a conexão S3, criação de buffer Sharp 1080x1350, upload no Cloudflare R2 e geração de URLs públicas assinadas.
 * @category Storage
 */
import sharp from "sharp";
import {
  ensureBucket,
  uploadImageBuffer,
  getImageUrl,
  imageExists,
  deleteImage,
} from "../core/storage.js";
import { env } from "../config/env.js";

async function main() {
  console.log("=========================================");
  console.log("☁️ TESTE DE STORAGE (CLOUDFLARE R2 / S3)");
  console.log("=========================================");
  console.log(`Endpoint: ${env.STORAGE_ENDPOINT}`);
  console.log(`Bucket:   ${env.STORAGE_BUCKET}`);
  console.log(`Região:   ${env.STORAGE_REGION}`);

  // 1. Conexão & Bucket
  console.log("\n🔌 [1/4] Verificando conexão e bucket...");
  await ensureBucket();
  console.log("✅ Bucket validado com sucesso.");

  // 2. Criação de buffer Sharp 1080x1350
  console.log("\n🎨 [2/4] Criando imagem de teste 1080x1350...");
  const imageBuffer = await sharp({
    create: {
      width: 1080,
      height: 1350,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  console.log(`✅ Imagem gerada na memória: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

  // 3. Upload para R2
  const objectKey = "tests/test-r2-verification.png";
  console.log(`\n📤 [3/4] Enviando buffer para key "${objectKey}"...`);
  await uploadImageBuffer(imageBuffer, objectKey, "image/png");
  console.log("✅ Upload concluído.");

  // 4. Verificação & URL Assinada Pública
  console.log("\n🔗 [4/4] Validando existência e gerando Presigned URL...");
  const exists = await imageExists(objectKey);
  if (!exists) {
    throw new Error("O arquivo foi enviado, mas não foi encontrado no R2.");
  }

  const presignedUrl = await getImageUrl(objectKey, 3600);
  console.log("✅ Imagem verificada no R2!");
  console.log(`\n🌐 URL Pública gerada para a Meta API:\n${presignedUrl}`);

  console.log("\n=========================================");
  console.log("✅ TESTE DO CLOUDFLARE R2 CONCLUÍDO COM SUCESSO!");
  console.log("=========================================");
}

main().catch((err) => {
  console.error("\n❌ ERRO NO TESTE DO R2:", err);
  process.exit(1);
});
