export type SlotFormat = "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | "REEL" | "STORY_PHOTO" | "STORY" | "STORIES";

export type SlotStatus = "PLANNED" | "READY" | "SCHEDULED" | "PUBLISHED";

export interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  timeSlot: string;
  editorialPillar?: string;
  format: SlotFormat;
  narrativeAngle?: string;
  topic: string;
  objective: string;
  reasoning: string;
  status: SlotStatus;
  postId?: string;
  pinned?: boolean;
  isCustom?: boolean;
  isStorySlot?: boolean;
  interactiveStoryType?: string;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
  weekOffset?: number;
  instagramUrl?: string;
}

export interface Slide {
  id: string;
  number: number;
  title: string;
  text: string;
  visualDirection?: string;
  imagePath?: string;
}

export interface Post {
  id: string;
  topic: string;
  format: SlotFormat;
  status: string;
  caption?: string;
  hashtags?: string;
  instagramMediaId?: string;
  instagramUrl?: string;
  slides: Slide[];
  createdAt: string;
}

export interface AgencyMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  audioUrl?: string;
  audioDuration?: number;
  options?: {
    id: string;
    title: string;
    description: string;
    format?: string;
    suggestedSlot?: {
      dayOfWeek: string;
      timeSlot: string;
    };
  }[];
}
