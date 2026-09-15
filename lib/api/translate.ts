/**
 * Traducción de sinopsis al español con MyMemory (https://mymemory.translated.net/doc/spec.php).
 *
 * API oficial y gratuita, sin clave. Límites: 500 caracteres por petición
 * (por eso se trocea por frases) y ~5000 caracteres/día por IP en modo anónimo.
 * El resultado se cachea en TanStack Query, así que cada anime se traduce una vez.
 */

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
export const MAX_QUERY_CHARS = 500;

/** Coletillas habituales de MAL que no tiene sentido traducir: se conservan tal cual. */
const TRAILER_PATTERN = /\s*(\[Written by MAL Rewrite\]|\(Source: [^)]*\))\s*$/i;

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
  responseStatus?: number | string;
  responseDetails?: string;
  quotaFinished?: boolean | null;
}

/** Divide una frase demasiado larga por espacios en trozos de como mucho `max` caracteres. */
function splitLongSentence(sentence: string, max: number): string[] {
  const words = sentence.split(/\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Trocea un párrafo en bloques de frases consecutivas sin superar `max` caracteres.
 * Exportado para poder probarlo aislado.
 */
export function splitForTranslation(text: string, max = MAX_QUERY_CHARS): string[] {
  const sentences = text
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > max) {
      if (current) chunks.push(current);
      current = '';
      chunks.push(...splitLongSentence(sentence, max));
      continue;
    }
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > max) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(text: string): Promise<string> {
  const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|es`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MyMemory HTTP ${response.status}`);
  }
  const body = (await response.json()) as MyMemoryResponse;
  if (body.quotaFinished === true) {
    throw new Error('Se agotó la cuota diaria de traducción. Inténtalo mañana.');
  }
  // En errores el estado llega como string ("403"), de ahí el Number().
  if (Number(body.responseStatus) !== 200 || !body.responseData?.translatedText) {
    throw new Error(body.responseDetails || 'MyMemory devolvió una respuesta inválida');
  }
  return body.responseData.translatedText;
}

/**
 * Traduce una sinopsis completa al español respetando los párrafos.
 * Las peticiones van en secuencia para no disparar el rate limit del servicio.
 */
export async function translateToSpanish(text: string): Promise<string> {
  const trailerMatch = text.match(TRAILER_PATTERN);
  const trailer = trailerMatch ? trailerMatch[1] : null;
  const body = trailer ? text.replace(TRAILER_PATTERN, '') : text;

  const paragraphs = body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const translatedParagraphs: string[] = [];
  for (const paragraph of paragraphs) {
    const translatedChunks: string[] = [];
    for (const chunk of splitForTranslation(paragraph)) {
      translatedChunks.push(await translateChunk(chunk));
    }
    translatedParagraphs.push(translatedChunks.join(' '));
  }

  const result = translatedParagraphs.join('\n\n');
  return trailer ? `${result}\n\n${trailer}` : result;
}
