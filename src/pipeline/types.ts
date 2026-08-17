export interface GeneratedSlideData {
  number: number;
  title: string;
  text: string;
  visualDirection: string;
  imageBuffer?: Buffer;
  imagePath?: string;
}

export interface GeneratedContentData {
  topic: string;
  format: string;
  objective: string;
  hook: string;
  caption: string;
  hashtags: string[];
  slides: GeneratedSlideData[];
}

export interface StrategyDecisionData {
  format: string;
  topic: string;
  objective: string;
  reasoning: string;
  hook: string;
}

export interface QualityReviewResult {
  status: "APPROVED" | "NEEDS_REVISION";
  score: number;
  technicalAccuracy: number;
  hookQuality: number;
  structureQuality: number;
  educationalValue: number;
  engagementPotential: number;
  visualConsistency: number;
  strengths: string[];
  problems: string[];
  suggestions: string[];
  summary: string;
}

export interface PipelineContext {
  postId?: string;
  slotId?: string;
  decision?: StrategyDecisionData;
  content?: GeneratedContentData;
  imageBuffers?: Map<number, Buffer>;
  reviewResult?: QualityReviewResult;
}

export type PipelineStageId =
  | "strategy"
  | "content"
  | "database"
  | "images"
  | "storage"
  | "review"
  | "finalize";

export interface PipelineStageHandler {
  id: PipelineStageId;
  name: string;
  execute(ctx: PipelineContext, log: (msg: string, type?: "info" | "success" | "warning" | "error") => void): Promise<void>;
}
