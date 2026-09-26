/**
 * Fuzzy person-name matching for the Sunday School check-in.
 *
 * Children's names are stored in Arabic, but parents type them many different
 * ways: with or without tashkeel, with different alef / alef-maqsura / ta-marbuta
 * spellings, with typos, or transliterated into Latin letters ("mina" vs "مينا").
 *
 * Strategy — take the best of:
 *   1. a strict ratio on the normalized strings (handles typos in one script),
 *   2. a phonetic ratio on a transliterated, vowel-collapsed form
 *      (handles Latin-vs-Arabic and vowel-suffix differences),
 *   3. the best per-token ratio (handles partial names such as first name only).
 */

const ARABIC_DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/g;
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;
const NON_NAME_CHARS = /[^a-z0-9\u0621-\u064A]+/g;

/** Lowercase, strip diacritics/tatweel/punctuation, unify letter variants. */
export function normalizeName(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(ARABIC_INDIC_DIGITS, (d) =>
      String(d.charCodeAt(0) >= 0x06f0 ? d.charCodeAt(0) - 0x06f0 : d.charCodeAt(0) - 0x0660)
    )
    // Alef family, ta marbuta, alef maqsura, hamza-carrying letters.
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064a")
    .toLowerCase()
    .replace(NON_NAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Arabic letter -> Latin transliteration (digests for th/kh/dh/sh/gh/zh). */
const ARABIC_TO_LATIN: Record<string, string> = {
  "\u0627": "a", "\u0628": "b", "\u062a": "t", "\u062b": "th", "\u062c": "g",
  "\u062d": "h", "\u062e": "kh", "\u062f": "d", "\u0630": "dh", "\u0631": "r",
  "\u0632": "z", "\u0633": "s", "\u0634": "sh", "\u0635": "s", "\u0636": "d",
  "\u0637": "t", "\u0638": "z", "\u0639": "a", "\u063a": "gh", "\u0640": "",
  "\u0641": "f", "\u0642": "q", "\u0643": "k", "\u0644": "l", "\u0645": "m",
  "\u0646": "n", "\u0647": "h", "\u0648": "w", "\u064a": "y",
};

function transliterate(input: string): string {
  let out = "";
  for (const ch of input) out += ARABIC_TO_LATIN[ch] ?? ch;
  return out;
}

const VOWEL_LIKE = new Set(["a", "e", "i", "o", "u", "y", "w"]);

/**
 * Phonetic canonical form: transliterate to Latin, turn every vowel-like
 * letter into a single weak marker, collapse runs and trim the edges.
 * "george" -> "g.r.g", translit("جورج") -> "g.r.g", "mina" -> "m.n".
 */
function phoneticForm(input: string): string {
  const latin = transliterate(input);
  let out = "";
  let inWeakRun = false;
  for (const ch of latin) {
    const weak = VOWEL_LIKE.has(ch) && /[a-z]/.test(ch);
    if (weak) {
      if (!inWeakRun) out += ".";
      inWeakRun = true;
      continue;
    }
    inWeakRun = false;
    // Collapse doubled letters, so the very common "Youhanna" spelling lines up
    // with the Arabic "يوحنا" (which only writes one n).
    if (ch === "." || out.endsWith(ch)) continue;
    out += ch;
  }
  return out.replace(/^\.+|\.+$/g, "");
}

function substitutionCost(a: string, b: string, strict: boolean): number {
  if (a === b) return 0;
  if (!strict && VOWEL_LIKE.has(a) && VOWEL_LIKE.has(b)) return 0.4;
  return 1;
}

function distance(a: string, b: string, strict: boolean): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = new Array<number>(cols);
  let curr = new Array<number>(cols);
  for (let j = 0; j < cols; j++) prev[j] = j;

  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    for (let j = 1; j < cols; j++) {
      const cost = substitutionCost(a[i - 1], b[j - 1], strict);
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[cols - 1];
}

function ratio(a: string, b: string, strict: boolean): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b, strict) / maxLen;
}

/** Best score for one token against a list of tokens (strict or phonetic). */
function bestTokenScore(token: string, against: string[]): number {
  const phonetic = phoneticForm(token);
  let best = 0;
  for (const other of against) {
    const score = Math.max(ratio(token, other, true), ratio(phonetic, phoneticForm(other), false));
    if (score > best) best = score;
  }
  return best;
}

/** Score in [0, 1] — higher means a better match. */
export function scoreNameMatch(query: string, candidate: string): number {
  const nq = normalizeName(query);
  const nc = normalizeName(candidate);
  if (!nq || !nc) return 0;

  // 1. Strict ratio on the normalized text (typos, same script).
  let score = ratio(nq, nc, true);

  // 2. Phonetic ratio (Latin vs Arabic, vowel suffixes).
  const pq = phoneticForm(nq);
  const pc = phoneticForm(nc);
  score = Math.max(score, ratio(pq, pc, false));

  // 3. Token-aware comparison, so word order or a middle name does not matter
  //    and a single typo in one word only costs that word.
  //
  //    The candidate coverage matters: without it a query sharing one common
  //    word ("محمد" between two different children) would score a perfect 1.
  const queryTokens = nq.split(" ").filter(Boolean);
  const candidateTokens = nc.split(" ").filter(Boolean);
  if (queryTokens.length > 0 && candidateTokens.length > 0) {
    const queryCoverage =
      queryTokens.reduce((acc, qt) => acc + bestTokenScore(qt, candidateTokens), 0) /
      queryTokens.length;
    const candidateCoverage =
      candidateTokens.reduce((acc, ct) => acc + bestTokenScore(ct, queryTokens), 0) /
      candidateTokens.length;
    const tokenScore = 0.75 * queryCoverage + 0.25 * Math.min(queryCoverage, candidateCoverage);
    score = Math.max(score, tokenScore);

    // 4. Given-name gate. Arabic names share long family names, so two different
    //    children ("مينا ماجد فخرى" vs "يوحنا عماد فخري") can score high purely
    //    because of the shared surname. Unless the leading name lines up on one
    //    of the two sides, damp the score so a shared surname cannot fake it.
    const givenNameScore = Math.max(
      bestTokenScore(queryTokens[0], candidateTokens),
      bestTokenScore(candidateTokens[0], queryTokens)
    );
    score *= 0.6 + 0.4 * givenNameScore;
  }

  return score;
}

/** Accept a match only when it is clearly a person's name, not a coincidence. */
export const NAME_MATCH_THRESHOLD = 0.75;

export interface RankedNameMatch<T> {
  item: T;
  score: number;
}

/**
 * Rank candidates against a typed query. Returns every candidate scoring at or
 * above the threshold, best first — an empty list means "name not found".
 */
export function matchNames<T extends { fullName: string }>(
  query: string,
  candidates: T[],
  options: { threshold?: number; limit?: number } = {}
): RankedNameMatch<T>[] {
  const threshold = options.threshold ?? NAME_MATCH_THRESHOLD;
  const limit = options.limit ?? 3;

  return candidates
    .map((item) => ({ item, score: scoreNameMatch(query, item.fullName) }))
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
