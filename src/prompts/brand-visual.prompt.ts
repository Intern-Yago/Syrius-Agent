export interface GeneratedSlidePromptInput {
  number: number;
  title: string;
  text: string;
  visualDirection: string;
}

export interface ImagePromptResult {
  prompt: string;
  size: "896x1152";
}

export const BRAND_VISUAL_IDENTITY = `
BRAND VISUAL IDENTITY
The entire carousel must feel like ONE professionally designed technology editorial series.

COLOR SYSTEM:
- Primary background: near-black graphite
- Primary accent: electric blue
- Secondary accent: cyan
- Text: clean white
- Positive/status accents: restrained green when technically appropriate
- Red may only be used when semantically necessary
- Avoid purple-dominant compositions
- Avoid changing the dominant color scheme between slides

OVERALL STYLE:
- Premium dark technology editorial
- Professional software engineering aesthetic
- Modern developer-focused visual language
- Sophisticated rather than flashy
- Technical rather than futuristic
- Clean rather than cyberpunk
- Editorial rather than advertising
- Subtle depth and controlled highlights
- Sharp geometric forms

INTERFACE LANGUAGE:
- Inspired by professional developer tools, terminal interfaces, code editors, architecture diagrams, API flows and system architectures.
- DO NOT use: Generic hacker imagery, neon cyberpunk aesthetics, excessive glowing effects.

TYPOGRAPHY:
- Modern geometric sans-serif
- Extremely high readability on smartphone screens
- Strong visual hierarchy
- White or very light text with excellent contrast against background

CONSISTENCY RULE:
Every slide must look like it belongs to the exact same professional Instagram carousel.
`;

export function buildImagePrompt(
  slide: GeneratedSlidePromptInput,
  totalSlides: number
): ImagePromptResult {
  const prompt = `
Create a COMPLETE premium vertical Instagram carousel slide for a professional Brazilian technology profile.
The generated image itself must contain the editorial typography and visual composition.
The final image IS the complete finished carousel slide (896x1152).

==============================
CAROUSEL INFORMATION
==============================
SLIDE: ${slide.number} of ${totalSlides}

==============================
EXACT EDITORIAL CONTENT
==============================
TITLE: "${slide.title}"
BODY TEXT: "${slide.text}"

IMPORTANT:
The title and body text above MUST appear visibly inside the generated image.
Render this exact editorial content as typography. Do not paraphrase or translate.
Preserve the Portuguese wording exactly as provided.

SLIDE NUMBER:
"${String(slide.number).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}"

==============================
VISUAL DIRECTION
==============================
${slide.visualDirection}

==============================
BRAND VISUAL IDENTITY
==============================
${BRAND_VISUAL_IDENTITY}

FORMAT:
Vertical Instagram carousel (896x1152).
Sharp typography, high contrast, clean alignment and safe area margins.
`.trim();

  return {
    prompt,
    size: "896x1152",
  };
}
