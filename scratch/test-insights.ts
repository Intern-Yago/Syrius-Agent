import { env } from "../src/config/env.js";

async function testInsights(mediaId: string) {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  const url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}/${mediaId}/insights?metric=reach,impressions,saved,shares,total_interactions&access_token=${token}`;
  
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\nInsights para Media ${mediaId}:`, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(`Erro ao consultar insights de ${mediaId}:`, e);
  }
}

async function testMediaFields(mediaId: string) {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  const url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}/${mediaId}?fields=id,caption,media_type,like_count,comments_count,timestamp&access_token=${token}`;
  
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\nMedia Fields para ${mediaId}:`, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(`Erro ao consultar fields de ${mediaId}:`, e);
  }
}

async function main() {
  await testMediaFields("17874918585549139");
  await testInsights("17874918585549139");
  await testMediaFields("18098789465201310");
  await testInsights("18098789465201310");
}

main().catch(console.error);
