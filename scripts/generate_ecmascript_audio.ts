import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/core/database.js';
import { getSettings } from '../src/config/settings.js';

async function main() {
  const postId = 'cmsz3yt5y0000t4t8hp1alvem';
  console.log(`\n🎙️ Sintetizando voz ElevenLabs para o Post ${postId}...`);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: 'asc' } } }
  });

  if (!post) {
    console.error('Post não encontrado!');
    return;
  }

  // Prepara texto humanizado para locução
  const narration = [
    "Pare de usar try/catch pra tudo no seu JavaScript... Esse novo operador vai mudar o seu código pra sempre!",
    "Se liga... toda vez que você faz uma requisição assíncrona, precisa criar aquele bloco try/catch gigante. Se tiver várias chamadas, seu código vira uma bagunça de escopos aninhados, ruim de ler e péssimo pra dar manutenção.",
    "É pra resolver isso que surgiu a proposta do Safe Assignment Operator... o operador ponto de interrogação igual. Olha como fica simples: em vez daquele bloco gigante, você faz const [erro, resposta] = await fetch... Se der erro, ele cai na primeira variável. Se der certo, o dado vem na segunda... Sem nenhum try/catch no caminho!",
    "Isso deixa a arquitetura muito mais limpa... Salva esse vídeo pra consultar quando o operador chegar no Node e me segue aqui no Syrius Tech pra não perder nenhuma novidade!"
  ].join(" ... ");

  const settings = await getSettings();
  const apiKey = settings.voiceConfig?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
  const voiceId = settings.voiceConfig?.elevenLabsVoiceId || 'HmMggjJh26aAzvp7MtDb';

  console.log(`📡 Enviando para ElevenLabs (Voice ID: ${voiceId})...`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey.trim(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: narration,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.8,
      }
    })
  });

  if (!res.ok) {
    console.error('Erro na ElevenLabs:', res.status, await res.text());
    return;
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  const audioOutDir = path.resolve('output/reels-audio');
  const audioPath = path.join(audioOutDir, `reels_${postId}.mp3`);
  await fs.writeFile(audioPath, audioBuffer);
  console.log(`✅ Áudio ElevenLabs gerado com sucesso em: ${audioPath}`);
}

main();
