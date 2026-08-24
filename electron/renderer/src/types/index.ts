export type Page =
  | "home"
  | "agency"
  | "activities"
  | "schedule"
  | "trending"
  | "posts"
  | "interactions"
  | "analytics"
  | "tests"
  | "settings";

export type ActivityType =
  | "agent"
  | "publishing"
  | "image_regeneration"
  | "video_regeneration"
  | "analytics"
  | "tests"
  | "schedule_ai"
  | "trending_scan"
  | "repo_to_post"
  | "voice_synthesis"
  | "voice_training"
  | "generic";

export type ActivityStatus =
  | "running"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  targetPage: Page;
  targetId?: string;
  status: ActivityStatus;
  statusMessage: string;
  progress: number; // 0 to 100
  startedAt: number;
  elapsedSeconds?: number;
  errorLog?: string;
  canPause?: boolean;
  canStop?: boolean;
  canRetry?: boolean;
  meta?: Record<string, any>;
}

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
  suggestedTime?: string;
  reason: string;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
  objective?: "AUTHORITY" | "VIRALITY" | "EDUCATION" | "ENGAGEMENT" | string;
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
  watchTimeAnalysis?: string;
  playsCount?: number;
  reachTotal?: number;
  sharesCount?: number;
  repostsCount?: number;
  avgWatchTime?: number;
  totalWatchTime?: number;
  trafficSources?: {
    reelsTab?: number;
    explore?: number;
    feed?: number;
    profile?: number;
    other?: number;
  } | null;
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
  supersededById?: string | null;
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

export interface VoiceCloningConfig {
  provider: "elevenlabs" | "local" | "edge_tts" | "disabled";
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  voiceName?: string;
  stability?: number;
  similarityBoost?: number;
  localSampleAudioPath?: string;
  lastCalibratedAt?: string;
}

export interface AgencyManagerConfig {
  name: string;
  roleTitle?: string;
  edgeTtsVoice: string;
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
  voiceConfig?: VoiceCloningConfig;
  agencyManager?: AgencyManagerConfig;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  timeSlot: string;
  editorialPillar?: string;
  format: "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | "STORY_PHOTO" | string;
  narrativeAngle?: string;
  topic: string;
  objective: "AUTHORITY" | "VIRALITY" | "EDUCATION" | "ENGAGEMENT" | string;
  reasoning: string;
  status: "PLANNED" | "READY" | "SCHEDULED" | "PUBLISHED";
  postId?: string;
  pinned?: boolean;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
  weekOffset?: number;
  lastOverdueNotifiedAt?: string;
  instagramUrl?: string | null;
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
  slotId?: string;
  topic: string;
  format: string;
  narrativeAngle?: string | null;
  caption: string | null;
  hashtags: string[];
  status: string;
  createdAt: string;
  slides: PostSlide[];
  instagramUrl?: string | null;
  instagramMediaId?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
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

export interface VoiceCloningConfig {
  provider: "elevenlabs" | "local" | "edge_tts" | "disabled";
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  voiceName?: string;
  stability?: number;
  similarityBoost?: number;
  localSampleAudioPath?: string;
  lastCalibratedAt?: string;
  devicePreference?: "auto" | "cuda" | "cpu";
  nfeSteps?: number;
  trainedModelPath?: string;
  isModelTrained?: boolean;
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
  smtpConfig?: any;
  voiceConfig?: VoiceCloningConfig;
  trendingTopicsCount?: number;
  trendingRefreshIntervalDays?: number;
  lastTrendingRefreshedAt?: string;
  nightlyScheduleEnabled?: boolean;
  nightlyScheduleDay?: string;
  nightlyScheduleTime?: string;
  nightlyAutoProduceQueue?: boolean;
  lastNightlyRunAt?: string;
}

export interface TrendingTopicItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  whyTrending: string;
  suggestedAngle: string;
  suggestedFormat: "CAROUSEL" | "REEL_SCRIPT" | "SINGLE_IMAGE" | "STORY_PHOTO" | string;
  hookIdea: string;
  baseCopyPrompt?: string | null;
  baseVisualPrompt?: string | null;
  sourceLinks: string[];
  relevanceScore: number;
  status: "ACTIVE" | "IGNORED" | "GENERATED";
  generatedPostId?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

declare global {
  interface Window {
    electronAPI?: {
      ping?: () => Promise<string>;
      runAgent?: (fromStage?: string, slot?: any) => Promise<any>;
      stopAgent?: () => Promise<any>;
      onAgentLog?: (callback: (log: AgentLog) => void) => () => void;
      getPosts?: () => Promise<Post[]>;
      updatePost?: (postId: string, data: UpdatePostData) => Promise<{ success: boolean; post?: Post; error?: string }>;
      deletePost?: (postId: string) => Promise<{ success: boolean; error?: string }>;
      openImage?: (imagePath: string) => Promise<OpenImageResult>;
      downloadImage?: (payload: { imagePath: string; defaultFilename: string }) => Promise<{ success: boolean; error?: string }>;
      downloadAllPostImages?: (postId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
      regenerateImage?: (payload: { postId: string; slideId?: string; slideNumber?: number; customPrompt?: string; feedback?: string }) => Promise<{ success: boolean; imagePath?: string; post?: Post; error?: string }>;
      regenerateVideo?: (payload: { postId: string }) => Promise<{ success: boolean; post?: Post; error?: string }>;
      setPostStatus?: (postId: string, status: "READY" | "PUBLISHED" | "DRAFT" | "FAILED") => Promise<Post>;
      publishPost?: (postId: string, options?: { deletePrevious?: boolean }) => Promise<{ success: boolean; publishedMediaId?: string; permalink?: string; error?: string }>;
      getActivePublishings?: () => Promise<any>;
      onPublishProgress?: (callback: (data: any) => void) => () => void;
      getActiveRegenerations?: () => Promise<any>;
      onRegenerateProgress?: (callback: (data: any) => void) => () => void;
      getSchedule?: () => Promise<ScheduleSlot[]>;
      saveScheduleSlot?: (slot: ScheduleSlot) => Promise<ScheduleSlot[]>;
      saveScheduleAll?: (slots: ScheduleSlot[], weekOffset?: number) => Promise<ScheduleSlot[]>;
      deleteScheduleSlot?: (slotId: string) => Promise<ScheduleSlot[]>;
      generateScheduleAI?: (weekOffset?: number) => Promise<any>;
      advanceWeek?: () => Promise<any>;
      moveSlotWeek?: (slotId: string, targetWeekOffset: number) => Promise<any>;
      getAutoplay?: () => Promise<boolean>;
      setAutoplay?: (active: boolean) => Promise<boolean>;
      addTopicToSchedule?: (payload: any) => Promise<any>;
      getPendingRecommendations?: () => Promise<any[]>;
      clearPendingRecommendations?: () => Promise<any>;
      getSettings?: () => Promise<AppSettings>;
      saveSettings?: (settings: AppSettings) => Promise<boolean>;
      getProfile?: () => Promise<any>;
      generateBio?: (payload: any) => Promise<any>;
      generateHighlights?: (payload: any) => Promise<any>;
      sendTestEmail?: (targetEmail: string) => Promise<any>;
      getLearningInsights?: () => Promise<LearningInsight[]>;
      searchLearningInsights?: (query: string, limit?: number) => Promise<LearningInsight[]>;
      getAnalyticsHistory?: () => Promise<AnalyticsReport[]>;
      runAnalyticsAudit?: (options: any) => Promise<any>;
      getAnalyticsRunning?: () => Promise<boolean>;
      exportAnalyticsReport?: (format: string, report: any) => Promise<any>;
      onAnalyticsStatusChange?: (callback: (data: any) => void) => () => void;
      getInteractions?: () => Promise<CommunityInteraction[]>;
      generateInteractionReply?: (interactionId: string) => Promise<any>;
      sendInteractionReply?: (payload: any) => Promise<any>;
      convertInteractionToPost?: (payload: any) => Promise<any>;
      addManualInteraction?: (payload: any) => Promise<any>;
      getInteractionsAutoReply?: () => Promise<boolean>;
      setInteractionsAutoReply?: (active: boolean) => Promise<boolean>;
      getTests?: () => Promise<TestModuleInfo[]>;
      runTest?: (filename: string) => Promise<TestRunResult>;
      cancelTest?: (filename: string) => Promise<any>;
      getTestLogs?: (filename: string) => Promise<AgentLog[]>;
      onTestLog?: (callback: (log: AgentLog) => void) => () => void;
      onTestStatusChange?: (callback: (data: any) => void) => () => void;
      onSchedulePublishAlert?: (callback: (alert: any) => void) => () => void;
      openExternal?: (url: string) => Promise<{ success: boolean; error?: string }>;
      cloneVoiceElevenLabs?: (payload: { apiKey: string; voiceName: string; audioBase64: string; mimeType: string }) => Promise<{ success: boolean; voiceId?: string; error?: string }>;
      saveLocalVoiceSample?: (payload: { audioBase64: string; mimeType?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      testVoiceTTS?: (payload: { apiKey?: string; voiceId?: string; text: string; provider: string }) => Promise<{ success: boolean; audioBase64?: string; error?: string }>;
      listElevenLabsVoices?: (apiKey: string) => Promise<{ success: boolean; voices?: { voice_id: string; name: string }[]; error?: string }>;
      getTrendingTopics?: () => Promise<TrendingTopicItem[]>;
      refreshTrendingTopics?: () => Promise<{ success: boolean; topics?: TrendingTopicItem[]; error?: string }>;
      ignoreTrendingTopic?: (topicId: string) => Promise<{ success: boolean; error?: string }>;
      markTrendingAsGenerated?: (topicId: string, postId: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}


