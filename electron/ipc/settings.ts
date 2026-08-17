import { ipcMain } from "electron";
import { getSettings, saveSettings, AppSettings } from "../../src/config/settings.js";
import { getInstagramProfile } from "../../src/integrations/instagram/client.js";
import { executeStructuredPrompt } from "../../src/core/gemini.js";

let registered = false;

export interface HighlightItem {
  title: string;
  category: string;
  purpose: string;
  storyIdeas: string[];
  coverPrompt: string;
}

export function registerSettingsIPC() {
  if (registered) return;
  registered = true;

  // 1. Obter Configurações
  ipcMain.handle("settings:get", async (): Promise<AppSettings> => {
    return getSettings();
  });

  // 2. Salvar Configurações
  ipcMain.handle("settings:save", async (_event, newSettings: Partial<AppSettings>): Promise<AppSettings> => {
    return saveSettings(newSettings);
  });

  // 3. Obter Perfil Conectado do Instagram
  ipcMain.handle("profile:get", async () => {
    try {
      const profile = await getInstagramProfile();
      return {
        success: true,
        profile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Não foi possível carregar dados do Instagram",
      };
    }
  });

  // 4. Gerar Biografias de Alta Autoridade Técnica (Sem clichês de coach)
  ipcMain.handle(
    "profile:generate-bio",
    async (
      _event,
      payload: { niche: string; positioning: string; accountName: string }
    ): Promise<{ success: boolean; bios?: string[]; error?: string }> => {
      const prompt = `
Você é o mais conceituado Brand Strategist para Engenheiros de Software Seniores, Tech Leads e Criadores Técnicos no Instagram.

Sua tarefa é criar 3 opções de BIOGRAFIA DE ALTÍSSIMA AUTORIDADE E CONVERSÃO para o perfil no Instagram.

DADOS DA CONTA:
- Nome: ${payload.accountName || "Engenharia de Software"}
- Nicho: ${payload.niche || "Engenharia de Software, Backend, Cloud & Arquitetura"}
- Contexto: ${payload.positioning || "Desenvolvedor compartilhando código e arquitetura"}

REGRAS RÍGIDAS DE ESTILO (ANTI-CLICHÊ):
1. PROIBIDO o uso de emojis genéricos ou infantis (NÃO use 🚀, 💻, ⚡, 👇, 🔥, 🌐, etc.).
2. PROIBIDO frases vazias de autoajuda ou coach (ex: "Construindo o futuro", "Evoluindo a cada dia").
3. Estrutura limpa em 3 ou 4 linhas curtas com quebra de linha (\\n):
   - Linha 1: Título profissional / Especialidade técnica (ex: "Software Engineering & Backend Architecture").
   - Linha 2: Stack principal e foco real (ex: "TypeScript | Node.js | Docker | PostgreSQL").
   - Linha 3: Proposta de valor clara (ex: "Do código limpo à computação em nuvem").
   - Linha 4: Chamada para ação técnica elegante (ex: "Projetos, tutoriais e discussões na DM").
4. Máximo de 145 caracteres por bio.

OPÇÕES A GERAR:
- Opção 1: Foco em Arquitetura & Stack Moderna (Clean & Minimalist)
- Opção 2: Foco em Engenharia Prática & Resolução de Problemas
- Opção 3: Foco em Aprendizado Profundo & Comunidade Dev

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "bios": [
    "Opção 1 com quebras de linha",
    "Opção 2 com quebras de linha",
    "Opção 3 com quebras de linha"
  ]
}
`.trim();

      try {
        const res = await executeStructuredPrompt<{ bios: string[] }>(prompt);
        return {
          success: true,
          bios: res.bios || [],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao gerar bio com IA",
        };
      }
    }
  );

  // 5. Planejar Estratégia de Destaques (Highlights) para o Perfil
  ipcMain.handle(
    "profile:generate-highlights",
    async (
      _event,
      payload: { niche: string; positioning: string; accountName: string }
    ): Promise<{ success: boolean; highlights?: HighlightItem[]; error?: string }> => {
      const prompt = `
Você é o Chief Social Media Architect especializado em perfis técnicos e de tecnologia no Instagram.

Planeje os 4 DESTAQUES ESTRATÉGICOS IDEAIS para o perfil ${payload.accountName || "Dev Tech"} (${payload.niche || "Engenharia de Software"}).

ESTRUTURA DE UM PERFIL TECH DE SUCESSO:
1. "Sobre Mim / Stack": Quem é o criador, background, stacks principais.
2. "Projetos / Arquitetura": Casos reais de sistemas desenvolvidos, diagramas, deploy.
3. "Dev Tools": Ferramentas indispensáveis (Docker, Linux, Terminal, Extensões, Cloud).
4. "Q&A / Carreira": Dúvidas respondidas da audiência sobre código e jornada dev.

DIRETRIZES:
- Título curto de no máximo 12 caracteres (para não truncar na interface do Instagram).
- 3 ideias práticas de stories para colocar dentro daquele destaque.
- Conceito visual minimalista para a capa do destaque.

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "highlights": [
    {
      "title": "Sobre Mim",
      "category": "IDENTIDADE & STACK",
      "purpose": "Apresentar sua trajetória e especialidades técnicas aos novos seguidores.",
      "storyIdeas": [
        "Apresentação rápida: quem sou eu e o que construo",
        "Minha stack diária de desenvolvimento (Backend/Cloud)",
        "O objetivo desta página e como interagir comigo"
      ],
      "coverPrompt": "Dark minimalist vector icon of user code terminal avatar"
    },
    {
      "title": "Arquitetura",
      "category": "CASOS REAIS & CÓDIGO",
      "purpose": "Comprovar autoridade técnica mostrando arquiteturas reais e boas práticas.",
      "storyIdeas": [
        "Diagrama de microsserviços com Docker e Node.js",
        "Como desacoplei regras de negócio usando Clean Architecture",
        "Tratamento de erros robusto em APIs REST"
      ],
      "coverPrompt": "Dark minimalist vector icon of software architecture blocks"
    },
    {
      "title": "Dev Tools",
      "category": "PRODUTIVIDADE & SETUP",
      "purpose": "Compartilhar ferramentas e rotinas que atraem desenvolvedores.",
      "storyIdeas": [
        "Meu setup de terminal, fonte e extensões essenciais",
        "3 comandos de Docker que todo dev deveria usar",
        "Como configuro CI/CD no GitHub Actions"
      ],
      "coverPrompt": "Dark minimalist vector icon of development command tools"
    },
    {
      "title": "Perguntas",
      "category": "COMUNIDADE & NETWORKING",
      "purpose": "Manter as melhores dúvidas respondidas salvas para consulta futura.",
      "storyIdeas": [
        "Dúvida: Quando escolher PostgreSQL vs MongoDB?",
        "Dúvida: Vale a pena aprender TypeScript do início?",
        "Caixinha de perguntas aberta para quem está estudando"
      ],
      "coverPrompt": "Dark minimalist vector icon of chat bubble message"
    }
  ]
}
`.trim();

      try {
        const res = await executeStructuredPrompt<{ highlights: HighlightItem[] }>(prompt);
        return {
          success: true,
          highlights: res.highlights || [],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao gerar destaques com IA",
        };
      }
    }
  );

  // 6. Testar Envio de E-mail
  ipcMain.handle(
    "settings:send-test-email",
    async (_event, targetEmail?: string): Promise<{ success: boolean; message: string }> => {
      try {
        const { sendTestEmail } = await import("../../src/services/email-service.js");
        return await sendTestEmail(targetEmail);
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Erro ao enviar e-mail de teste",
        };
      }
    }
  );

  // 7. Obter Aprendizados e Memória RAG
  ipcMain.handle("rag:get-insights", async () => {
    try {
      const { getAllInsights } = await import("../../src/services/embedding-service.js");
      return await getAllInsights();
    } catch {
      return [];
    }
  });

  // 8. Buscar Insights Semânticos no RAG
  ipcMain.handle("rag:search-insights", async (_event, query: string, limit = 5) => {
    try {
      const { searchRelevantInsights } = await import("../../src/services/embedding-service.js");
      return await searchRelevantInsights(query, limit);
    } catch {
      return { activeInsights: [], refutedInsights: [] };
    }
  });

  console.log("[settings] IPC de Configurações, E-mail e RAG registrado com sucesso.");
}
