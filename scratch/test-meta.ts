import { getInstagramProfile, getInstagramMedia } from "../src/integrations/instagram/client.js";

async function main() {
  console.log("Consultando Instagram Graph API...");
  const profile = await getInstagramProfile();
  console.log("Perfil:", profile);

  const media = await getInstagramMedia();
  console.log("Posts encontrados no Instagram:", media.length);
  media.forEach((m, idx) => {
    console.log(`\n[Post ${idx + 1}] ID: ${m.id}`);
    console.log(`- Legenda: "${m.caption?.slice(0, 60)}..."`);
    console.log(`- Tipo: ${m.media_type}`);
    console.log(`- Data: ${m.timestamp}`);
  });
}

main().catch(console.error);
