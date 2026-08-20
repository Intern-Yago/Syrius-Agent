import { prisma } from "../core/database.js";

export interface TopicDecayCheck {
  isSaturated: boolean;
  topic: string;
  matchedKeyword?: string;
  occurrencesInWindow: number;
  recentPostsTitles: string[];
  cooldownDaysRemaining: number;
  warningMessage?: string;
  recommendedAlternatives: string[];
}

const COMMON_TECH_KEYWORDS = [
  "docker", "kubernetes", "k8s", "postgresql", "postgres", "sql", "redis",
  "typescript", "javascript", "react", "nextjs", "next.js", "nodejs", "node.js",
  "golang", "go", "python", "rust", "kafka", "rabbitmq", "aws", "cloudflare",
  "linux", "graphql", "clean code", "arquitetura", "monolito", "microsserviço",
  "security", "segurança", "git", "ci/cd", "devops", "prisma", "orm"
];

/**
 * Verifica se um tema ou tecnologia sofre de fadiga de conteúdo (saturação nos últimos 21 dias).
 * Utiliza consulta indexada no PostgreSQL sem gastar tokens de IA.
 */
export async function checkTopicDecay(proposedTopic: string, windowDays = 21): Promise<TopicDecayCheck> {
  const normalized = proposedTopic.toLowerCase();
  const matchedKeyword = COMMON_TECH_KEYWORDS.find((kw) => normalized.includes(kw));

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);

  const recentPosts = await prisma.post.findMany({
    where: {
      createdAt: { gte: cutoffDate },
    },
    select: {
      id: true,
      topic: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const matchingPosts = recentPosts.filter((p) => {
    const pTopic = p.topic.toLowerCase();
    if (matchedKeyword) {
      return pTopic.includes(matchedKeyword);
    }
    return pTopic.includes(normalized.slice(0, 15));
  });

  const occurrences = matchingPosts.length;
  const isSaturated = occurrences >= 3;

  let cooldownDaysRemaining = 0;
  if (matchingPosts.length > 0) {
    const lastPostDate = new Date(matchingPosts[0].createdAt);
    const elapsedDays = Math.floor((Date.now() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24));
    cooldownDaysRemaining = Math.max(0, 14 - elapsedDays);
  }

  const alternativeMap: Record<string, string[]> = {
    docker: ["Kubernetes", "Podman", "Linux Cgroups", "CI/CD com GitHub Actions"],
    postgresql: ["Redis para Caching", "SQLite no Edge", "ClickHouse para Analytics", "Índices B-Tree vs GIN"],
    react: ["Next.js 15 Server Components", "Arquitetura de Estado no Frontend", "TypeScript Avançado", "Zustand vs Redux"],
    typescript: ["Tipagem Estrita com Zod", "Type Narrowing e Generics", "Performance em V8/Node.js"],
    redis: ["RabbitMQ para Filas", "PostgreSQL LISTEN/NOTIFY", "Caching Strategies (Cache-Aside vs Write-Through)"],
  };

  const alternatives = matchedKeyword && alternativeMap[matchedKeyword]
    ? alternativeMap[matchedKeyword]
    : ["Arquitetura de Software", "Design Patterns", "Clean Code & Refatoração", "Segurança em APIs"];

  return {
    isSaturated,
    topic: proposedTopic,
    matchedKeyword,
    occurrencesInWindow: occurrences,
    recentPostsTitles: matchingPosts.map((p) => p.topic),
    cooldownDaysRemaining,
    warningMessage: isSaturated
      ? `Fadiga de Conteúdo detectada: O tema/tecnologia '${matchedKeyword || proposedTopic}' já apareceu ${occurrences} vezes nos últimos ${windowDays} dias. Recomendado alternar para evitar queda no alcance orgânico.`
      : undefined,
    recommendedAlternatives: alternatives,
  };
}
