export type NarrativeAngleType =
  | "BEFORE_AFTER"
  | "HOT_TAKE"
  | "MIGRATION_GUIDE"
  | "SENIOR_REVIEW"
  | "BREAKING_NEWS"
  | "DEEP_DIVE"
  | "COMMUNITY_PULSE"
  | "TLDR_SUMMARY"
  | "STEP_BY_STEP_TUTORIAL";

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
  narrativeAngle?: NarrativeAngleType;
  objective: string;
  hook: string;
  caption: string;
  hashtags: string[];
  slides: GeneratedSlideData[];
}

export interface StrategyDecisionData {
  format: string;
  narrativeAngle?: NarrativeAngleType;
  topic: string;
  objective: string;
  reasoning: string;
  hook: string;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
  suggestedTime?: string;
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
  | "video"
  | "review"
  | "finalize";

export interface PipelineStageHandler {
  id: PipelineStageId;
  name: string;
  execute(ctx: PipelineContext, log: (msg: string, type?: "info" | "success" | "warning" | "error") => void): Promise<void>;
}
