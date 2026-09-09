/**
 * Hooks de TanStack Query: listas de MAL (persistencia) + datos de Jikan (lectura).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getAnimeCharactersCatalog,
  getAnimeFullCatalog,
  searchAnimeCatalog,
} from '@/lib/api/catalog';
import { getRecentEpisodes } from '@/lib/api/jikan';
import {
  getAnimeRanking,
  getSeasonAnime,
  searchAnimeMal,
  seasonOf,
  type MalRankingType,
} from '@/lib/api/mal-public';
import {
  deleteFromMyList,
  getAnimeWithMyStatus,
  getMyAnimeList,
  MalListItem,
  MalWatchStatus,
  updateMyListStatus,
  UpdateListStatusParams,
} from '@/lib/api/mal';
import { useAuth } from '@/lib/auth/auth-context';

export type ListFilter = MalWatchStatus | 'all';

export const listKey = (filter: ListFilter) => ['mal', 'list', filter] as const;
export const myStatusKey = (animeId: number) => ['mal', 'anime', animeId] as const;

/**
 * Lista completa del usuario para un estado (o 'all').
 * MAL pagina por offset; aquí se traen todas las páginas de una vez
 * (limit 1000 → 1-3 peticiones incluso para listas grandes) para poder
 * mostrar contadores exactos como en la app original.
 */
export function useMyList(filter: ListFilter) {
  const { getAccessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: listKey(filter),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const token = await getAccessToken();
      const status = filter === 'all' ? undefined : filter;
      const items: MalListItem[] = [];
      let offset = 0;
      // Bucle de paginación hasta agotar la lista.
      for (;;) {
        const page = await getMyAnimeList(token, status, offset, 1000);
        items.push(...page.data);
        if (!page.paging.next) break;
        offset += 1000;
      }
      return items;
    },
  });
}

/** Mi estado en la lista para un anime concreto (solo con sesión). */
export function useMyListStatus(animeId: number) {
  const { getAccessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: myStatusKey(animeId),
    enabled: isAuthenticated && Number.isFinite(animeId),
    queryFn: async () => {
      const token = await getAccessToken();
      return getAnimeWithMyStatus(token, animeId);
    },
  });
}

/** Crea/actualiza la entrada en mi lista, con actualización optimista en las listas cacheadas. */
export function useUpdateListStatus() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ animeId, params }: { animeId: number; params: UpdateListStatusParams }) => {
      const token = await getAccessToken();
      return updateMyListStatus(token, animeId, params);
    },
    onMutate: async ({ animeId, params }) => {
      await queryClient.cancelQueries({ queryKey: ['mal'] });
      // Actualización optimista de todas las listas cacheadas.
      const listQueries = queryClient.getQueriesData<MalListItem[]>({ queryKey: ['mal', 'list'] });
      for (const [key, items] of listQueries) {
        if (!items) continue;
        queryClient.setQueryData<MalListItem[]>(
          key,
          items.map((item) =>
            item.node.id === animeId
              ? { ...item, list_status: { ...item.list_status, ...toListStatusPatch(params) } }
              : item,
          ),
        );
      }
      return { listQueries };
    },
    onError: (_error, _variables, context) => {
      // Revertir el cambio optimista.
      for (const [key, items] of context?.listQueries ?? []) {
        queryClient.setQueryData(key, items);
      }
    },
    onSettled: (_data, _error, { animeId }) => {
      queryClient.invalidateQueries({ queryKey: ['mal', 'list'] });
      queryClient.invalidateQueries({ queryKey: myStatusKey(animeId) });
    },
  });
}

function toListStatusPatch(params: UpdateListStatusParams) {
  const patch: Record<string, unknown> = {};
  if (params.status !== undefined) patch.status = params.status;
  if (params.num_watched_episodes !== undefined) patch.num_episodes_watched = params.num_watched_episodes;
  if (params.score !== undefined) patch.score = params.score;
  if (params.is_rewatching !== undefined) patch.is_rewatching = params.is_rewatching;
  return patch;
}

/** Elimina el anime de mi lista. */
export function useDeleteFromList() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (animeId: number) => {
      const token = await getAccessToken();
      return deleteFromMyList(token, animeId);
    },
    onSuccess: (_data, animeId) => {
      queryClient.invalidateQueries({ queryKey: ['mal', 'list'] });
      queryClient.invalidateQueries({ queryKey: myStatusKey(animeId) });
    },
  });
}

// ---------- Catálogo (Jikan + fallback MAL público, sin login) ----------

export function useAnimeFull(animeId: number) {
  return useQuery({
    queryKey: ['catalog', 'anime', animeId],
    enabled: Number.isFinite(animeId),
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => getAnimeFullCatalog(animeId),
  });
}

export function useAnimeCharacters(animeId: number) {
  return useQuery({
    queryKey: ['catalog', 'characters', animeId],
    enabled: Number.isFinite(animeId),
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => getAnimeCharactersCatalog(animeId),
  });
}

export function useSearchAnime(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['catalog', 'search', trimmed],
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: () => searchAnimeCatalog(trimmed),
  });
}

// ---------- Descubrir ----------

/**
 * Estas secciones tiran de la API pública de MAL, no de Jikan: sus equivalentes
 * (/top/anime, /seasons/now) devuelven 504 de forma sostenida. Cada sección tiene
 * su propio hook para que una que falle no tumbe el resto de la pantalla.
 */
export function useAnimeRanking(rankingType: MalRankingType, enabled = true) {
  return useQuery({
    queryKey: ['discover', 'ranking', rankingType],
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => getAnimeRanking(rankingType, 25),
  });
}

export function useCurrentSeason() {
  const { year, season } = seasonOf(new Date());
  return useQuery({
    queryKey: ['discover', 'season', year, season],
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => getSeasonAnime(year, season, 25),
  });
}

export function useRecentEpisodes() {
  return useQuery({
    queryKey: ['discover', 'recent-episodes'],
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => getRecentEpisodes(),
  });
}

/**
 * Búsqueda general contra MAL público con lote grande, porque los filtros de
 * género, tipo y puntuación se aplican después en cliente.
 */
export function useGlobalSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['discover', 'global-search', trimmed],
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: () => searchAnimeMal(trimmed, 100),
  });
}
