import type { GeneratedSlide } from "./content-generator";

export interface ImagePrompt {
  prompt: string;
  size: "896x1152";
}

/**
 * Identidade visual principal do perfil.
 *
 * Todos os slides pertencem à mesma identidade visual.
 * O conteúdo, assunto e composição mudam,
 * mas a linguagem visual permanece consistente.
 */
export const BRAND_VISUAL_IDENTITY = `
BRAND VISUAL IDENTITY

The entire carousel must feel like ONE professionally designed
technology editorial series.

COLOR SYSTEM:
- Primary background: near-black graphite
- Primary accent: electric blue
- Secondary accent: cyan
- Text: clean white
- Positive/status accents: restrained green when technically appropriate
- Red may only be used when semantically necessary
- Avoid purple-dominant compositions
- Avoid random color palettes
- Avoid changing the dominant color scheme between slides

OVERALL STYLE:
- Premium dark technology editorial
- Professional software engineering aesthetic
- Modern developer-focused visual language
- Sophisticated rather than flashy
- Technical rather than futuristic
- Clean rather than cyberpunk
- Editorial rather than advertising
- Subtle depth
- Subtle lighting
- Sharp geometric forms
- Controlled visual hierarchy

INTERFACE LANGUAGE:
- Inspired by professional developer tools
- Terminal interfaces
- Code editors
- Architecture diagrams
- API flows
- System diagrams
- Developer environments
- Abstract technical structures

Use these elements only when relevant to the slide subject.

DO NOT use:
- Generic hacker imagery
- Neon cyberpunk aesthetics
- Excessive glowing effects
- Random colorful gradients
- Futuristic cliché interfaces
- Gaming aesthetics
- Stock-photo aesthetics

TYPOGRAPHY:
- Modern geometric sans-serif
- Extremely high readability
- Strong visual hierarchy
- Clean professional typography
- Large readable titles
- Comfortable mobile reading
- White or very light text
- Excellent contrast against the background
- Consistent typography across all slides

LIGHTING:
- Subtle studio-like lighting
- Controlled highlights
- Soft depth
- No excessive bloom
- No extreme neon glow

COMPOSITION:
- Clean geometric composition
- Strong alignment
- Generous negative space
- Clear focal point
- Important elements inside safe margins
- Visual hierarchy optimized for smartphone screens
- Text must never overlap important visual elements
- Text must never be cut off
- Text must remain completely inside the canvas

CONSISTENCY RULE:
Every slide must look like it belongs to the exact same
professional Instagram carousel.

The viewer should immediately recognize that all slides
were created as part of the same visual system.

Do NOT create a new visual identity for each slide.

Do NOT randomly change the dominant colors.

Do NOT randomly change the design language.

Do NOT randomly change the lighting style.

Do NOT randomly change the typography style.

The specific visual subject may change from slide to slide,
but the BRAND VISUAL IDENTITY must remain constant.
`;

/**
 * Constrói o prompt visual de um slide.
 *
 * IMPORTANTE:
 *
 * A IA é responsável por gerar a arte COMPLETA,
 * incluindo o texto editorial.
 *
 * Não adicionar texto posteriormente via React,
 * HTML ou Sharp.
 */
export function buildImagePrompt(
  slide: GeneratedSlide,
  totalSlides: number
): ImagePrompt {
  const prompt = `
Create a COMPLETE premium vertical Instagram carousel slide
for a professional Brazilian technology profile.

The generated image itself must contain the editorial
typography and visual composition.

The final image is NOT a background image.

The final image IS the complete finished carousel slide.

==============================
CAROUSEL INFORMATION
==============================

SLIDE:
${slide.number} of ${totalSlides}

==============================
EXACT EDITORIAL CONTENT
==============================

TITLE:

"${slide.title}"

BODY TEXT:

"${slide.text}"

IMPORTANT:

The title and body text above MUST appear visibly inside
the generated image.

You must render this exact editorial content as typography.

Do NOT remove it.

Do NOT summarize it.

Do NOT paraphrase it.

Do NOT translate it.

Do NOT replace it with different text.

Do NOT invent additional editorial text.

Preserve the wording exactly as provided above.

The text is part of the actual final artwork.

==============================
SLIDE NUMBER
==============================

Display the slide number prominently but elegantly.

Use this format:

${String(slide.number).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}

The slide number should be visually integrated into the
editorial design.

==============================
VISUAL DIRECTION
==============================

${slide.visualDirection}

Use the visual direction to determine the main visual subject,
illustration, diagram, interface, object or technical concept.

The visual direction controls WHAT the viewer sees.

The editorial content controls WHAT the viewer reads.

Both must coexist in the final composition.

==============================
BRAND VISUAL IDENTITY
==============================

${BRAND_VISUAL_IDENTITY}

==============================
TEXT COMPOSITION
==============================

The text is a PRIMARY component of the composition.

Design the slide as a professional editorial layout.

Use a clear hierarchy:

1. Slide number
2. Large strong title
3. Supporting body text
4. Main visual subject

The title must be visually dominant.

The body text must be clearly readable on a smartphone.

Use generous spacing between title and body.

Use short visual line lengths when appropriate.

Never place text directly over a visually complex area
when doing so would reduce readability.

Use cards, panels, subtle containers, gradients,
blurred surfaces or controlled negative space when useful
to create separation between text and visuals.

Typography must feel intentionally designed,
not randomly placed.

==============================
TEXT ACCURACY
==============================

EXTREMELY IMPORTANT:

Render the provided Portuguese text accurately.

Do not invent words.

Do not change words.

Do not omit important words.

Do not generate fake paragraphs.

Do not generate fake technical information.

Do not add unrelated labels.

Do not add fake UI text.

Do not add random code.

Do not add random numbers.

Do not add random symbols.

Do not add hashtags.

Do not add captions outside the provided body text.

Only the following editorial text is authorized:

TITLE:
"${slide.title}"

BODY:
"${slide.text}"

SLIDE NUMBER:
"${String(slide.number).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}"

==============================
VISUAL + EDITORIAL BALANCE
==============================

The image must combine:

- professional editorial typography
- technical visual storytelling
- strong hierarchy
- clean spacing
- premium dark technology aesthetic

Do not make the visual so large that it pushes the text
outside the safe area.

Do not make the text so large that the visual concept
becomes irrelevant.

Both typography and visual storytelling are essential.

==============================
SAFE AREA
==============================

Keep ALL text and important visual elements safely inside
the canvas.

Never crop:

- title
- body text
- slide number
- important visual elements

Maintain generous margins around the entire composition.

==============================
FORMAT
==============================

Vertical Instagram carousel.

Canvas:

896x1152

The final image must be a complete finished slide.

Do NOT create a simple background.

Do NOT create an empty template.

Do NOT leave empty space expecting another system
to add the text later.

The generated image must already contain the title,
body text and slide number.

==============================
QUALITY
==============================

Professional editorial design.

Premium technology publication quality.

Sharp typography.

Excellent text readability.

Cohesive visual hierarchy.

High contrast.

Clean alignment.

Sophisticated composition.

The result should look like it was created by a
professional designer for a high-end Brazilian
software engineering Instagram profile.

Every slide must look like part of the same carousel.
`;

  return {
    prompt: prompt.trim(),
    size: "896x1152",
  };
}
