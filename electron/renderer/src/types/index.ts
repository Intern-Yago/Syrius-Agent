export type Page = "home" | "schedule" | "posts" | "interactions" | "analytics" | "tests" | "settings";

export type LogType = "info" | "success" | "warning" | "error";

export interface CommunityInteraction {
  id: string;
  sourcePostId?: string;
  sourcePostTopic?: string;
  sourcePostFormat?: string; // "CAROUSEL" | "REEL_SCRIPT" | "STORY_PHOTO" | "SINGLE_IMAGE"
  sourcePostUrl?: string;    // Link clicável do post no Instagram (ex: https://instagram.com/p/...)
  authorHandle: string;      // Ex: "@dev_lucas"
  authorName?: string;
  content: string;           // O comentário / dúvida real da pessoa
  receivedAt: string;
  type: "COMMENT" | "QUESTION_STICKER" | "DIRECT_MESSAGE";
  status: "UNANSWERED" | "ANSWERED" | "CONVERTED_TO_POST";
  replyText?: string;
  repliedAt?: string;
  convertedSlotId?: string;
}

export interface RecommendedTopicItem {
  topic: string;
  suggestedFormat: "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | "STORY_PHOTO" | string;
  suggestedDay: string;
  reason: string;
}

export interface IndividualPostAudit {
  postId?: string;
  postTopic: string;
  postFormat: string;
  publishedAt?: string;
  whyItWorked: string;
  whatHurtIt: string;
  hookAnalysis: string;
  retentionEstimate?: string;
  individualScore: number;
}

export interface SelfCorrectionItem {
  title: string;
  previousAssumption: string;
  newReality: string;
  reasoning: string;
}

export interface LearningInsight {
  id: string;
  type: string;
  title: string;
  content: string;
  status: "HYPOTHESIS" | "VALIDATED" | "REFUTED";
  confidenceScore: number;
  evidencePostsCount: number;
  correctionReasoning?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsReport {
  id: string;
  createdAt: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  score: number;
  reachTotal: number;
  impressionsTotal: number;
  interactionsTotal: number;
  engagementRate?: number;
  likesCount?: number;
  commentsCount?: number;
  savesCount?: number;
  sharesCount?: number;
  followersGained: number;
  totalPostsAnalyzed?: number;
  bestPerformingTopic: string;
  formatPerformance: {
    format: string;
    avgInteractions: number;
    efficiencyNote: string;
  }[];
  quantitativeSummary: string;
  qualitativeStrengths: string[];
  qualitativeWeaknesses: string[];
  strategicDirectives: string[];
  recommendedTopicsForNextCycle: (RecommendedTopicItem | string)[];
  individualPostsBreakdown?: IndividualPostAudit[];
  selfCorrections?: SelfCorrectionItem[];
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  from?: string;
}

export interface AppSettings {
  instagramHandle: string;
  accountName: string;
  niche: string;
  positioning: string;
  analyticsIntervalHours: number;
  analyticsSchedule?: AnalyticsScheduleConfig;
  autoPublish: boolean;
  defaultGeminiModel: string;
  notificationEmail?: string;
  emailNotificationsEnabled?: boolean;
  smtpConfig?: SmtpConfig;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  timeSlot: string;
  editorialPillar?: string;
  format: "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | "STORY_PHOTO" | string;
  topic: string;
  objective: "AUTHORITY" | "VIRALITY" | "EDUCATION" | "ENGAGEMENT" | string;
  reasoning: string;
  status: "PLANNED" | "READY" | "SCHEDULED" | "PUBLISHED";
  postId?: string;
  isCustom?: boolean;
  pinned?: boolean;
}

export interface AgentLog {
  type: LogType;
  message: string;
  timestamp?: string;
  stageId?: string;
}

export interface AgentRunResult {
  success: boolean;
  message?: string;
  postId?: string;
  topic?: string;
  score?: number;
}

export type AgentStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "error";

export type StageIconType =
  | "strategy"
  | "content"
  | "database"
  | "images"
  | "storage"
  | "review"
  | "finalize";

export interface AgentStage {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  iconType: StageIconType;
  status: AgentStageStatus;
  progress?: string;
  summary?: string;
  duration?: string;
  startedAt?: number;
  logs: AgentLog[];
  errorMessage?: string;
  retryable?: boolean;
}

export interface PostSlide {
  id: string;
  number: number;
  title: string;
  text: string;
  visualDirection: string;
  imagePath?: string | null;
}

export interface Post {
  id: string;
  topic: string;
  format: string;
  caption: string | null;
  hashtags: string[];
  status: string;
  createdAt: string;
  slides: PostSlide[];
}

export interface UpdatePostData {
  topic: string;
  caption: string;
  hashtags: string[];
}

export interface OpenImageResult {
  success: boolean;
  message?: string;
}

export interface TestModuleInfo {
  id: string;
  filename: string;
  title: string;
  description: string;
  category: string;
}

export interface TestRunResult {
  success: boolean;
  message?: string;
  duration?: string;
}

export type AnalyticsScheduleMode =
  | "INTERVAL_HOURS"
  | "WEEKDAYS"
  | "WEEKLY"
  | "MONTHLY"
  | "MANUAL";

export interface AnalyticsScheduleConfig {
  mode: AnalyticsScheduleMode;
  intervalHours?: number; // 1, 6, 12, 24, 48
  selectedDays?: string[]; // ["Segunda-feira", "Quarta-feira", "Sexta-feira"]
  timeSlot?: string; // "20:00"
  dayOfMonth?: number; // 1 to 31
}


