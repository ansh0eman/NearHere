import type { AvatarCatalogId, AvatarRenderId, AvatarV3Configuration, KenneyAppearanceId } from '../../../packages/contracts/avatar';

// Keep runtime constants local: Node's lightweight source tests do not compile
// the contracts package. The contract package repeats these finite values and
// TypeScript verifies every caller against its types.
export const AVATAR_CATALOG_IDS: readonly AvatarCatalogId[] = ['v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06'];
const KENNEY_APPEARANCE_IDS: readonly KenneyAppearanceId[] = ['kenney-01', 'kenney-02', 'kenney-03', 'kenney-04', 'kenney-05', 'kenney-06', 'kenney-07', 'kenney-08'];

export function isAvatarCatalogId(value: unknown): value is AvatarCatalogId {
  return typeof value === 'string' && AVATAR_CATALOG_IDS.includes(value as AvatarCatalogId);
}

function isKenneyAppearanceId(value: unknown): value is KenneyAppearanceId {
  return typeof value === 'string' && KENNEY_APPEARANCE_IDS.includes(value as KenneyAppearanceId);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAvatarSeed(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/**
 * V3 is deliberately a finite local-art reference, not a URL or arbitrary image.
 * The fallback keeps older app builds readable during a gradual rollout.
 */
export function isAvatarV3Configuration(value: unknown): value is AvatarV3Configuration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  return config.version === 3
    && isAvatarSeed(config.seed)
    && config.catalogVersion === 1
    && isKenneyAppearanceId(config.appearanceId)
    && isAvatarCatalogId(config.fallbackAvatarId);
}

/** Unknown/legacy configurations remain readable while avatar artwork evolves. */
export function avatarSeed(config: unknown, fallback: string): string {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const value = config as Record<string, unknown>;
    if ((value.version === 1 || value.version === 3) && isAvatarSeed(value.seed)) return value.seed;
  }
  return fallback;
}

export function avatarChoice(config: unknown, fallback: string): AvatarRenderId {
  const seed = avatarSeed(config, fallback);
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const value = config as Record<string, unknown>;
    if (isAvatarV3Configuration(value)) return value.appearanceId;
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
