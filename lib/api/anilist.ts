/**
 * Calendario de emisión con AniList (https://docs.anilist.co/guide/graphql/).
 *
 * MAL no da el próximo episodio ni la hora de emisión; AniList sí
 * (`nextAiringEpisode`) y permite cruzar por ID de MAL. API gratuita sin clave.
 */

const ANILIST_API = 'https://graphql.anilist.co';
const BATCH_SIZE = 50;

const QUERY = `
query ($ids: [Int]) {
  Page(perPage: ${BATCH_SIZE}) {
    media(idMal_in: $ids, type: ANIME) {
      idMal
      nextAiringEpisode { episode airingAt }
    }
  }
}`;

/** Próximo episodio por emitir de un anime. */
export interface AiringInfo {
  nextEpisode: number;
  /** Epoch en ms de la emisión de `nextEpisode`. */
  airingAt: number;
}

/**
 * Se usa un objeto plano (no Map) porque el resultado se persiste como JSON en
 * el caché de TanStack Query. Solo aparecen los animes con próximo episodio.
 */
export type AiringSchedule = Record<number, AiringInfo>;

interface AniListResponse {
  data?: {
    Page?: {
      media?: {
        idMal: number | null;
        nextAiringEpisode: { episode: number; airingAt: number } | null;
      }[];
    };
  };
  errors?: { message: string }[];
}

async function fetchBatch(ids: number[]): Promise<AiringSchedule> {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { ids } }),
  });
  if (!response.ok) {
    throw new Error(`AniList HTTP ${response.status}`);
  }
  const body = (await response.json()) as AniListResponse;
  if (body.errors?.length) {
    throw new Error(body.errors[0].message);
  }
  const schedule: AiringSchedule = {};
  for (const media of body.data?.Page?.media ?? []) {
    if (media.idMal == null || !media.nextAiringEpisode) continue;
    schedule[media.idMal] = {
      nextEpisode: media.nextAiringEpisode.episode,
      airingAt: media.nextAiringEpisode.airingAt * 1000,
    };
  }
  return schedule;
}

/** Próximo episodio de cada anime (por ID de MAL). Lotes en secuencia para respetar el rate limit. */
export async function getAiringSchedule(malIds: number[]): Promise<AiringSchedule> {
  const schedule: AiringSchedule = {};
  for (let i = 0; i < malIds.length; i += BATCH_SIZE) {
    Object.assign(schedule, await fetchBatch(malIds.slice(i, i + BATCH_SIZE)));
  }
  return schedule;
}
