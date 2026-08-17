import { runPipeline, RunPipelineResult } from "./pipeline/orchestrator.js";

export async function runAgent(fromStage?: string): Promise<RunPipelineResult> {
  return runPipeline({ fromStage });
}