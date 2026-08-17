/**
 * @title Instagram Graph API
 * @description Testa a recuperação de dados do perfil, histórico de mídias publicadas e métricas de audiência do Instagram (@syrius_tech).
 * @category Instagram
 */
import "dotenv/config";
import {
  getInstagramProfile,
  getInstagramMedia,
  getInstagramAudience,
} from "../integrations/instagram/client.js";

async function main() {
  console.log("=================================");
  console.log("📊 INSTAGRAM DATA TEST");
  console.log("=================================\n");

  console.log("👤 Buscando perfil...");

  const profile =
    await getInstagramProfile();

  console.log(profile);

  console.log(
    "\n📚 Buscando publicações..."
  );

  const media =
    await getInstagramMedia();

  console.log(
    `Publicações encontradas: ${media.length}`
  );

  console.log(media);

  console.log(
    "\n📈 Buscando audiência..."
  );

  const audience =
    await getInstagramAudience();

  console.log(audience);

  console.log(
    "\n================================="
  );

  console.log(
    "✅ TESTE CONCLUÍDO"
  );

  console.log(
    "================================="
  );
}

main().catch((error) => {
  console.error(
    "\n❌ ERRO:"
  );

  console.error(error);

  process.exit(1);
});