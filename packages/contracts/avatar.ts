/** Publicly selectable, bundled legacy character artwork. Never reorder or reuse IDs. */
export const AVATAR_CATALOG_IDS = ['v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06'] as const;

export type AvatarCatalogId = (typeof AVATAR_CATALOG_IDS)[number];

/** Bounded CC0 Kenney looks compiled into the native bundle. */
export const KENNEY_APPEARANCE_IDS = ['kenney-01', 'kenney-02', 'kenney-03', 'kenney-04', 'kenney-05', 'kenney-06', 'kenney-07', 'kenney-08'] as const;

export type KenneyAppearanceId = (typeof KENNEY_APPEARANCE_IDS)[number];
export type AvatarRenderId = AvatarCatalogId | KenneyAppearanceId;

export interface AvatarV1Configuration {
  version: 1;
  seed?: string;
  avatarId?: AvatarCatalogId;
}

/** Older accounts created before durable avatar assignment can still have `{}`. */
export interface AvatarUnassignedConfiguration {
  version?: undefined;
}

/**
 * A bounded appearance reference. The native bundle resolves the ID to artwork;
 * arbitrary URLs, paths and uploaded raster output are never persisted here.
 */
export interface AvatarV3Configuration {
  version: 3;
  seed: string;
  catalogVersion: 1;
  appearanceId: KenneyAppearanceId;
  /** Readable selected character for v1 clients and legacy projections. */
  fallbackAvatarId: AvatarCatalogId;
}

export type AvatarConfiguration =
  | AvatarUnassignedConfiguration
  | AvatarV1Configuration
  | AvatarV3Configuration;

export function isAvatarCatalogId(value: unknown): value is AvatarCatalogId {
  return typeof value === 'string'
    && AVATAR_CATALOG_IDS.includes(value as AvatarCatalogId);
}

export function isKenneyAppearanceId(value: unknown): value is KenneyAppearanceId {
  return typeof value === 'string'
    && KENNEY_APPEARANCE_IDS.includes(value as KenneyAppearanceId);
}

export function isAvatarRenderId(value: unknown): value is AvatarRenderId {
  return isAvatarCatalogId(value) || isKenneyAppearanceId(value);
}
