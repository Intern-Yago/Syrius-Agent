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
The image must feel like ONE professionally designed technology editorial piece for @syrius_tech.

COLOR SYSTEM:
- Primary background: deep near-black graphite (#090d16)
- Primary accent: electric blue (#38bdf8)
- Secondary accent: cyan / emerald accents (#10b981)
- Text: clean high-contrast white (#ffffff) and cool slate (#94a3b8)
- Status accents: warm amber (#f59e0b) or critical red (#ef4444) only when semantically needed

OVERALL STYLE:
- Premium dark technology editorial
- Professional software engineering aesthetic
- Modern developer-focused visual language
- Sophisticated, clean, sharp geometric forms, subtle studio lighting and depth
- DO NOT use: generic green Matrix code rain, cheap neon cyberpunk overload, messy stock-photo clichés.

TYPOGRAPHY & SAFE MARGINS:
- Modern geometric sans-serif
- Extremely high readability on smartphone screens
- Generous padding and safe margins from all 4 borders (top, bottom, left, right)
- Text must NEVER be cut off, overflow, or clip the canvas edges.
`;

/**
 * Remove anotações internas de roteiro como "CENA 1 [0-4s]: GANCHO" ou "[0-5s]"
 */
export function cleanEditorialTitle(raw: string, fallbackText?: string): string {
  if (!raw) return fallbackText ? fallbackText.split("\n")[0].trim() : "";
  let clean = raw
    .replace(/\[.*?\]/g, "")
    .replace(/^CENA\s*\d+\s*[:\-–]?\s*/gi, "")
    .replace(/^GANCHO\s*[:\-–]?\s*/gi, "")
    .replace(/^SLIDE\s*\d+(\s*\/\s*\d+)?\s*[:\-–]?\s*/gi, "")
    .trim();

  // Se o título ficou vazio ou apenas "GANCHO", usa a primeira frase do texto do slide (ex: POV: ...)
  if (!clean || clean.toUpperCase() === "GANCHO" || clean.length <= 4) {
    if (fallbackText) {
      const firstLine = fallbackText.split("\n")[0].replace(/\[.*?\]/g, "").trim();
      if (firstLine.length > 5) return firstLine;
    }
    clean = raw.replace(/\[.*?\]/g, "").trim();
  }
  return clean;
}

/**
 * Remove anotações como [ ESPAÇO PARA CAIXA DE PERGUNTAS ]
 */
export function cleanEditorialText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\[\s*ESPAÇO PARA.*?\s*\]/gi, "")
    .replace(/\[.*?\]/g, "")
    .trim();
}

export function buildImagePrompt(
  slide: GeneratedSlidePromptInput,
  totalSlides: number,
  format = "CAROUSEL"
): ImagePromptResult {
  const cleanTitle = cleanEditorialTitle(slide.title, slide.text);
  const cleanText = cleanEditorialText(slide.text);
  const isReel = format === "REEL_SCRIPT" || format === "REEL" || format === "REELS";
  const isStory = format === "STORY_PHOTO" || format === "STORIES" || format === "STORY";

  let prompt = "";

  if (isReel) {
    // 🎬 CAPA OFICIAL VERTICAL (9:16) PARA REELS DO INSTAGRAM
    prompt = `
Create a COMPLETE, stunning 9:16 vertical cover artwork (1080x1920) for an Instagram Reel on a top-tier Brazilian tech channel (@syrius_tech).

COMPOSITION & VISUAL SUBJECT:
- Upper-middle area: A compact floating dark text badge (maximum width 65% of canvas, with 20% empty safe margins from left, right, and top edges so it NEVER touches the canvas borders). Inside the floating badge: clean, bold white typography "${cleanTitle}".
- Center & lower area: Main subject: ${slide.visualDirection || "A professional software developer in a modern dark studio, focused on a glowing laptop/IDE terminal with code on screen"}.
- Mood: High-stakes tech challenge, high engagement, dramatic lighting, modern developer aesthetic.
- DO NOT place video editing markers, timestamps, or script annotations like "CENA 1" or "[0-4s]".

IMPORTANT INSTRUCTIONS:
- The headline "${cleanTitle}" must appear strictly centered inside the compact floating badge with huge margins away from the edges.
- Perfect 9:16 vertical ratio with safe margins (keep key text and faces in the central 4:5 safe area so it looks amazing both in the Reels tab and the Instagram Feed profile grid).
- ${BRAND_VISUAL_IDENTITY}
`.trim();
  } else if (isStory) {
    // 📱 STORY VERTICAL (9:16) COM MARGENS SEGURAS E ESPAÇO PARA STICKER/CAIXINHA
    prompt = `
Create a COMPLETE, clean, minimalist 9:16 vertical Instagram Story artwork (1080x1920) for a software engineering profile (@syrius_tech).

LAYOUT & COMPOSITION:
- Top Header Area: Clear bold question/topic "${cleanTitle}" inside safe upper bounds.
- Central Area: Clean, spacious, dark graphite background with subtle tech/code accents, leaving an uncluttered center space for placing native Instagram interaction stickers.
- Bottom Footer Area: "${cleanText || "Manda a sua resposta aqui embaixo! 👇"}" with subtle CTA arrow.
- Safe Area Margins: Ensure generous 120px padding from top, bottom, and side edges so Instagram UI and mobile bezels never cut off text.

VISUAL DIRECTION:
${slide.visualDirection || "Dark minimalist tech background, subtle developer terminal accents, high contrast typography"}

${BRAND_VISUAL_IDENTITY}
`.trim();
  } else {
    // 📚 CARROSSEL / POST SOLO (4:5 VERTICAL)
    prompt = `
Create a COMPLETE premium vertical Instagram slide (${slide.number} of ${totalSlides}) for a professional Brazilian technology profile.
The generated image itself must contain the editorial typography and visual composition.

EXACT EDITORIAL CONTENT:
TITLE: "${cleanTitle}"
BODY TEXT: "${cleanText}"

SLIDE NUMBER:
"${String(slide.number).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}"

VISUAL DIRECTION:
${slide.visualDirection}

${BRAND_VISUAL_IDENTITY}

FORMAT:
Vertical Instagram slide (1080x1350 / 896x1152).
Sharp typography, high contrast, clean alignment, and safe area margins inside the frame.
`.trim();
  }

  return {
    prompt,
    size: "896x1152",
  };
}

export interface RefinePromptFeedbackInput {
  feedback: string;
  slideTitle: string;
  slideText: string;
  currentVisualDirection?: string;
  format: string;
  slideNumber: number;
  totalSlides: number;
}

export interface RefinedPromptOutput {
  refinedPrompt: string;
  updatedVisualDirection: string;
  rationale: string;
}

export async function refineImagePromptWithFeedback(
  input: RefinePromptFeedbackInput
): Promise<RefinedPromptOutput> {
  const { executeStructuredPrompt } = await import("../core/gemini.js");

  const prompt = `
You are the Lead Art Director & Expert Prompt Engineer for @syrius_tech.
A human user reviewed the generated artwork and provided specific feedback/complaints that MUST be corrected.

SLIDE CONTEXT:
- Format: ${input.format}
- Slide Number: ${input.slideNumber} of ${input.totalSlides}
- Title/Hook: "${input.slideTitle}"
- Text/Script: "${input.slideText}"
- Previous Visual Direction: "${input.currentVisualDirection || "N/A"}"

EXACT USER FEEDBACK / COMPLAINT:
"${input.feedback}"

CRITICAL RULES FOR REFINED PROMPT:
1. The "refinedPrompt" MUST BE ENTIRELY WRITTEN IN ENGLISH (Cloudflare Recraft v3 only understands English layout instructions).
2. TEXT BANNER & TYPOGRAPHY PLACEMENT (TO PREVENT CROPPED OR CUT OFF BORDERS):
   - The title MUST be placed in a COMPACT, FLOATING CENTERED CARD/BADGE in the upper-middle area.
   - The badge must have a MAXIMUM width of 70% of the canvas, leaving massive 18% to 20% empty padding from the left, right, and top edges.
   - It must NEVER touch or stretch across the canvas edges!
3. VISUAL SUBJECT:
   - Follow the user's feedback precisely (e.g. distressed developer holding head in panic staring at error screens, dramatic cyan and red glow, cinematic 8k).
4. BRAND COLORS:
   - Background: Dark graphite near-black (#090d16)
   - Accents: Electric cyan (#38bdf8), error red (#ef4444)
   - Text: Crisp high-contrast white (#ffffff)

OUTPUT JSON SCHEMA:
{
  "updatedVisualDirection": "Clear, updated visual direction in Portuguese for the database",
  "refinedPrompt": "Complete, highly detailed English prompt for Cloudflare Recraft v3 text-to-image with strict compact centered text badge rules",
  "rationale": "Short explanation in Portuguese of the changes made"
}
`.trim();

  return executeStructuredPrompt<RefinedPromptOutput>(prompt);
}
