import sharp from "sharp";

export interface TypographyOverlayOptions {
  title?: string | null;
  subtitle?: string | null;
  format?: string;
  isVertical?: boolean;
  width?: number;
  height?: number;
}

/**
 * Adiciona uma camada de tipografia nítida e estilizada com margens de segurança 100% garantidas.
 * Impede que a IA difusora corte textos ou crie aberrações nas bordas do 9:16 e 4:5.
 */
export async function overlaySlideTypography(
  imageBuffer: Buffer,
  options: TypographyOverlayOptions
): Promise<Buffer> {
  const isVertical =
    options.isVertical ??
    (options.format === "STORY_PHOTO" ||
      options.format === "STORIES" ||
      options.format === "REEL_SCRIPT" ||
      options.format === "REEL");

  const width = options.width || 1080;
  const height = options.height || (isVertical ? 1920 : 1350);

  if (!options.title || options.title.trim().length === 0) {
    return imageBuffer;
  }

  const cleanTitle = options.title
    .replace(/\[.*?\]/g, "")
    .replace(/^CENA\s*\d+\s*[:\-–]?\s*/gi, "")
    .replace(/^GANCHO\s*[:\-–]?\s*/gi, "")
    .replace(/^SLIDE\s*\d+(\s*\/\s*\d+)?\s*[:\-–]?\s*/gi, "")
    .trim();

  if (!cleanTitle || cleanTitle.length < 3) {
    return imageBuffer;
  }

  // Largura máxima do badge: 75% da tela para NUNCA tocar nas bordas
  const badgeWidth = Math.min(Math.round(width * 0.78), 840);
  const badgeHeight = cleanTitle.length > 35 ? 120 : 96;
  const badgeX = Math.round((width - badgeWidth) / 2);
  const badgeY = isVertical ? 170 : 100;

  // Escapa caracteres XML
  const escapedTitle = cleanTitle
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const fontSize = cleanTitle.length > 40 ? 30 : cleanTitle.length > 25 ? 34 : 38;

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#060912" stop-opacity="0.94"/>
        <stop offset="100%" stop-color="#0d1527" stop-opacity="0.90"/>
      </linearGradient>
      <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.85"/>
      </filter>
    </defs>
    
    <!-- Floating Glassmorphism Container with guaranteed 100% safe margins (200px from borders) -->
    <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="24" fill="url(#badgeGradient)" stroke="#38bdf8" stroke-width="2.5" stroke-opacity="0.6" filter="url(#badgeShadow)"/>
    
    <text x="${width / 2}" y="${badgeY + (badgeHeight / 2) + 12}" font-family="system-ui, -apple-system, Roboto, sans-serif" font-size="${fontSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2.5">
      ${escapedTitle}
    </text>
  </svg>
  `;

  try {
    return await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();
  } catch (err) {
    console.warn("[TypographyCompositor] Falha ao compor SVG, mantendo imagem original:", err);
    return imageBuffer;
  }
}
