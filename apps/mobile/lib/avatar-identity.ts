import type { AvatarCatalogId } from '../../../packages/contracts/avatar';

export const AVATAR_CATALOG_IDS: readonly AvatarCatalogId[] = ['v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06'];

export function isAvatarCatalogId(value: unknown): value is AvatarCatalogId {
  return typeof value === 'string' && AVATAR_CATALOG_IDS.includes(value as AvatarCatalogId);
}

/** Unknown/legacy configurations remain readable while avatar artwork evolves. */
export function avatarSeed(config: unknown, fallback: string): string {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const value = config as Record<string, unknown>;
    if (value.version === 1 && typeof value.seed === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.seed)) return value.seed;
  }
  return fallback;
}

export function avatarChoice(config: unknown, fallback: string): AvatarCatalogId {
  const seed = avatarSeed(config, fallback);
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const value = config as Record<string, unknown>;
    if (value.version === 1 && isAvatarCatalogId(value.avatarId)) return value.avatarId;
  }
  return AVATAR_CATALOG_IDS[avatarIndex(seed, AVATAR_CATALOG_IDS.length)];
}

/** Stable for a seed within catalog v1. Do not reorder catalog entries after release. */
export function avatarIndex(seed: string, catalogSize = 6): number {
  if (!Number.isInteger(catalogSize) || catalogSize < 1) return 0;
  const hash = Array.from(seed).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return hash % catalogSize;
}
