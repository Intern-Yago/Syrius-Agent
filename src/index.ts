import "dotenv/config";
import { runPipeline } from "./pipeline/orchestrator.js";
import { prisma } from "./core/database.js";

async function main() {
  const fromStage = process.env.AGENT_FROM_STAGE || undefined;
  let slot = undefined;

  if (process.env.AGENT_SLOT_JSON) {
    try {
      slot = JSON.parse(process.env.AGENT_SLOT_JSON);
    } catch (e) {
      console.warn("⚠️ Não foi possível interpretar AGENT_SLOT_JSON:", e);
    }
  }

  try {
    const result = await runPipeline({ fromStage, slot });
    if (!result.success) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("\n❌ ERRO FATAL NO PIPELINE:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();