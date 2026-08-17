import { env } from "../src/config/env.js";

async function testInsights(mediaId: string, metric: string) {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  const url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}/${mediaId}/insights?metric=${metric}&access_token=${token}`;
  
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\nInsights (${metric}) para ${mediaId}:`, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(`Erro:`, e);
  }
}

async function main() {
  await testInsights("17874918585549139", "reach,saved,total_interactions");
  await testInsights("18098789465201310", "reach,saved,total_interactions");
}

main().catch(console.error);
