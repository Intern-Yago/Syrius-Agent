import "dotenv/config";

const token = process.env.INSTAGRAM_ACCESS_TOKEN;

if (!token) {
  throw new Error(
    "INSTAGRAM_ACCESS_TOKEN não encontrado no .env"
  );
}

const INSTAGRAM_API_VERSION =
  process.env.INSTAGRAM_API_VERSION || "v20.0";

const BASE_URL =
  `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;

async function instagramRequest(
  endpoint: string
) {
  const separator = endpoint.includes("?")
    ? "&"
    : "?";

  const url =
    `${BASE_URL}${endpoint}` +
    `${separator}access_token=${token}`;

  const response = await fetch(url);

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data?.error?.message ||
        `Instagram API retornou HTTP ${response.status}`
    );
  }

  return data;
}

/*
 * ==========================================
 * PERFIL
 * ==========================================
 */

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  followers_count?: number;
  media_count?: number;
  biography?: string;
}

export async function getInstagramProfile(): Promise<InstagramProfile> {
  try {
    const data =
      await instagramRequest(
        "/me?fields=id,username,name,followers_count,media_count,biography"
      );

    return data;
  } catch (error) {
    console.error(
      "Erro ao buscar perfil do Instagram:",
      error
    );

    throw error;
  }
}

/*
 * ==========================================
 * PUBLICAÇÕES
 * ==========================================
 */

export interface InstagramMedia {
  id: string;
  caption: string;
  media_type: string;
  permalink?: string;
  timestamp?: string;
}

export async function getInstagramMedia(): Promise<
  InstagramMedia[]
> {
  try {
    const data =
      await instagramRequest(
        "/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url"
      );

    if (!data.data) {
      return [];
    }

    return data.data.map(
      (post: any) => ({
        id: post.id,
        caption: post.caption ?? "",
        media_type: post.media_type,
        permalink: post.permalink,
        timestamp: post.timestamp,
      })
    );
  } catch (error) {
    console.error(
      "Erro ao buscar publicações do Instagram:",
      error
    );

    throw error;
  }
}

/*
 * ==========================================
 * AUDIÊNCIA / INSIGHTS
 * ==========================================
 */

export async function getInstagramAudience() {
  try {
    const data =
      await instagramRequest(
        "/me/insights?metric=reach,follower_count,profile_views,online_followers,accounts_engaged,total_interactions&period=day"
      );

    return data.data ?? [];
  } catch (error) {
    console.error(
      "Erro ao buscar dados de audiência do Instagram:",
      error
    );

    throw error;
  }
}

/*
 * ==========================================
 * TESTE DIRETO
 * ==========================================
 */

async function main() {
  console.log(
    "\nIniciando conexão direta com a Instagram API...\n"
  );

  const profile =
    await getInstagramProfile();

  console.log(
    "\n--- DADOS DO PERFIL ---\n"
  );

  console.log(profile);

  const media =
    await getInstagramMedia();

  console.log(
    "\n--- PUBLICAÇÕES ---\n"
  );

  console.log(
    `Total: ${media.length}`
  );

  const audience =
    await getInstagramAudience();

  console.log(
    "\n--- AUDIÊNCIA / INSIGHTS ---\n"
  );

  console.log(audience);
}

if (
  process.argv[1]?.includes("instagram.ts")
) {
  main().catch((error) => {
    console.error(
      "\n❌ Erro fatal:"
    );

    console.error(error);

    process.exit(1);
  });
}