export type ContentFormat =
  | "carousel"
  | "reel"
  | "static";

export type ContentSlide = {
  number: number;
  title: string;
  text: string;
  visualDirection: string;
};

export type SocialPost = {
  format: ContentFormat;
  objective: string;
  audience: string;
  pillar: string;
  topic: string;
  hook: string;
  slides: ContentSlide[];
  caption: string;
  cta: string;
  hashtags: string[];
  visualBrief: string;
};

export type PostReview = {
  approved: boolean;
  score: number;
  strengths: string[];
  problems: string[];
  suggestions: string[];
};

export type PostGenerationResult = {
  post: SocialPost;
  review: PostReview;
  attempts: number;
  approved: boolean;
};