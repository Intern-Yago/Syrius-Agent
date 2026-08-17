import { getSettings } from "./settings.js";

export async function getBrandInfo() {
  const settings = await getSettings();

  return {
    name: settings.accountName || "Creator",
    handle: settings.instagramHandle.startsWith("@") ? settings.instagramHandle : `@${settings.instagramHandle}`,
    niche: settings.niche,
    audience: [
      "desenvolvedores",
      "programadores iniciantes e experientes",
      "estudantes de tecnologia",
      "profissionais de TI e engenheiros de software",
    ],
    positioning: settings.positioning,
    tone: [
      "direto",
      "natural",
      "didático",
      "humano",
      "prático",
      "tecnicamente preciso",
    ],
    expertise: [
      "Desenvolvimento de Software",
      "TypeScript & Node.js",
      "React & Frontend Moderno",
      "DevOps, Docker & CI/CD",
      "Linux & Infraestrutura Cloud",
      "Bancos de Dados SQL & NoSQL",
      "Arquitetura de Sistemas & IA Aplicada",
    ],
    goals: [
      "aumentar autoridade técnica",
      "crescer audiência qualificada",
      "compartilhar conhecimento prático e real",
      "gerar oportunidades profissionais",
    ],
  };
}
