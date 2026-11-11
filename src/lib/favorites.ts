export const FAVORITES_KEY = 'mybr-favorites';
export const FAVORITES_MAX = 100;

/** 저장된 값에서 문자열 UID만, 중복 없이, 실제 있는 글만 남긴다. */
export function sanitizeFavorites(raw: unknown, valid: ReadonlySet<string>): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((v): v is string => typeof v === 'string' && valid.has(v)))].slice(-FAVORITES_MAX);
}

/** 이미 있으면 빼고, 없으면 맨 뒤에 넣는다. 원본 배열은 바꾸지 않는다. */
export function toggleFavorite(list: readonly string[], uid: string): string[] {
  return list.includes(uid) ? list.filter(id => id !== uid) : [...list, uid].slice(-FAVORITES_MAX);
}
