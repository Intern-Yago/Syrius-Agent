/**
 * @title Content Generator (6 Slides)
 * @description Testa a geração estruturada dos 6 slides, legendas técnicas, visual direction e hashtags a partir da decisão estratégica.
 * @category Redação
 */
import "dotenv/config";
import { decideNextContent } from "../services/content-strategist.js";
import { generatePostContent } from "../services/content-generator.js";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada."
    );
  }

  console.log(
    "🧠 Consultando histórico..."
  );

  // Por enquanto usamos o estrategista diretamente.
  // O test-strategy.ts já possui a consulta ao banco.
  // Nesta etapa estamos testando exclusivamente
  // a passagem DECISÃO → CONTEÚDO.

  const decision = await decideNextContent(
    apiKey,
    {
      recentTopics: [],
      recentFormats: [],
    }
  );

  console.log(
    "\n=============================="
  );
  console.log(
    "DECISÃO DO GESTOR"
  );
  console.log(
    "=============================="
  );

  console.log(
    JSON.stringify(
      decision,
      null,
      2
    )
  );

  console.log(
    "\n✍️ Gerando conteúdo..."
  );

  const content =
    await generatePostContent(
      apiKey,
      decision
    );

  console.log(
    "\n=============================="
  );
  console.log(
    "CONTEÚDO GERADO"
  );
  console.log(
    "=============================="
  );

  console.log(
    JSON.stringify(
      content,
      null,
      2
    )
  );

  console.log(
    "\n=============================="
  );
  console.log(
    `✅ ${content.slides.length} slides gerados`
  );
  console.log(
    "=============================="
  );
}

main().catch((error) => {
  console.error(
    "\n❌ Erro:"
  );

  console.error(error);

  process.exit(1);
});