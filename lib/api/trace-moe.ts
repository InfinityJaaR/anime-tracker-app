/**
 * Búsqueda de anime por captura con trace.moe (https://trace.moe), un servicio
 * gratuito y sin clave que localiza el fotograma en su índice de episodios.
 * Cuota anónima: 100 búsquedas al mes por IP y 1 simultánea.
 */

const TRACE_API = 'https://api.trace.moe';
const REQUEST_TIMEOUT_MS = 40_000;
const MAX_RESULTS = 5;
/** Por debajo de esto trace.moe recomienda no fiarse del resultado. */
export const LOW_CONFIDENCE = 0.87;

export type TraceErrorKind = 'network' | 'invalid_image' | 'rate_limit' | 'service';

export class TraceMoeError extends Error {
  constructor(
    readonly kind: TraceErrorKind,
    message: string,
  ) {
    super(message);
  }
}

interface TraceResult {
  anilist: {
    id: number;
    idMal: number | null;
    title: { romaji?: string | null; english?: string | null; native?: string | null };
    isAdult?: boolean;
  };
  episode: number | string | null;
  /** Segundo del episodio donde aparece la escena. */
  from: number;
  similarity: number;
  image: string;
  video: string;
}

export interface ImageMatch {
  anilistId: number;
  malId: number | null;
  title: string;
  /** null en películas y especiales sin número. */
  episode: number | null;
  /** Segundo del episodio donde aparece la escena. */
  at: number;
  /** De 0 a 1. */
  similarity: number;
  imageUrl: string;
}

function episodeNumber(value: TraceResult['episode']): number | null {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Deja una coincidencia por anime (la de mayor similitud), sin contenido adulto,
 * ordenadas de mejor a peor. trace.moe devuelve varios fotogramas del mismo anime.
 */
export function groupMatches(results: TraceResult[], limit = MAX_RESULTS): ImageMatch[] {
  const best = new Map<number, TraceResult>();
  for (const result of results) {
    if (result.anilist.isAdult) continue;
    const current = best.get(result.anilist.id);
    if (!current || result.similarity > current.similarity) best.set(result.anilist.id, result);
  }
  return [...best.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((r) => ({
      anilistId: r.anilist.id,
      malId: r.anilist.idMal ?? null,
      title: r.anilist.title.romaji ?? r.anilist.title.english ?? r.anilist.title.native ?? 'Sin título',
      episode: episodeNumber(r.episode),
      at: r.from,
      similarity: r.similarity,
      imageUrl: r.image,
    }));
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new TraceMoeError('network', 'No se pudo conectar con el buscador. Revisa tu conexión.');
  } finally {
    clearTimeout(timer);
  }
}

/** Busca el anime de una imagen local (uri de la galería). */
export async function searchByImage(uri: string, mimeType = 'image/jpeg'): Promise<ImageMatch[]> {
  const form = new FormData();
  // React Native acepta { uri, name, type } como archivo de FormData.
  form.append('image', { uri, name: 'captura.jpg', type: mimeType } as unknown as Blob);

  const response = await request(`${TRACE_API}/search?anilistInfo&cutBorders`, {
    method: 'POST',
    body: form,
  });
  if (response.status === 400) {
    throw new TraceMoeError('invalid_image', 'No se pudo leer la imagen. Prueba con otra captura.');
  }
  if (response.status === 402 || response.status === 429) {
    throw new TraceMoeError(
      'rate_limit',
      'Demasiadas búsquedas seguidas o llegaste al límite mensual. Inténtalo más tarde.',
    );
  }
  if (!response.ok) {
    throw new TraceMoeError('service', `El buscador no está disponible (${response.status}).`);
  }
  const body = (await response.json()) as { result?: TraceResult[]; error?: string };
  if (body.error) throw new TraceMoeError('service', body.error);
  return groupMatches(body.result ?? []);
}

export interface TraceQuota {
  quota: number;
  used: number;
  remaining: number;
}

/** Búsquedas disponibles este mes para esta conexión. */
export async function getQuota(): Promise<TraceQuota> {
  const response = await request(`${TRACE_API}/me`);
  if (!response.ok) throw new TraceMoeError('service', `trace.moe respondió ${response.status}`);
  const body = (await response.json()) as { quota: number; quotaUsed: number };
  return { quota: body.quota, used: body.quotaUsed, remaining: Math.max(0, body.quota - body.quotaUsed) };
}
