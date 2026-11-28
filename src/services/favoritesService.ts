import type { StorageLike } from './consentService';

export const GUEST_FAVORITES_STORAGE_KEY = 'limiar_favorites_guest_v1';
export const MAX_FAVORITE_ITEMS = 100;

function getLocalStorageSafe(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function normalizeFavoriteIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_FAVORITE_ITEMS) break;
  }
  return out;
}

export function loadGuestFavorites(
  storage: StorageLike | null = getLocalStorageSafe()
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(GUEST_FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    return normalizeFavoriteIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveGuestFavorites(
  ids: string[],
  storage: StorageLike | null = getLocalStorageSafe()
): string[] {
  const normalized = normalizeFavoriteIds(ids);
  if (storage) {
    try {
      storage.setItem(GUEST_FAVORITES_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore storage failure
    }
  }
  return normalized;
}

export function clearGuestFavorites(
  storage: StorageLike | null = getLocalStorageSafe()
): void {
  if (!storage) return;
  try {
    storage.removeItem(GUEST_FAVORITES_STORAGE_KEY);
  } catch {
    // ignore storage failure
  }
}

export function toggleFavoriteInList(list: string[], productId: string): {
  next: string[];
  added: boolean;
} {
  const trimmed = productId.trim();
  if (!trimmed) return { next: list, added: false };
  if (list.includes(trimmed)) {
    return {
      next: list.filter((id) => id !== trimmed),
      added: false,
    };
  }
  return {
    next: normalizeFavoriteIds([trimmed, ...list]),
    added: true,
  };
}

export function mergeFavoriteLists(guestIds: string[], memberIds: string[]): string[] {
  return normalizeFavoriteIds([...memberIds, ...guestIds]);
}
