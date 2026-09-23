/** Publicly selectable, bundled character artwork. Append IDs; never reuse them. */
export const AVATAR_CATALOG_IDS = ['v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06'] as const;

export type AvatarCatalogId = (typeof AVATAR_CATALOG_IDS)[number];

export function isAvatarCatalogId(value: unknown): value is AvatarCatalogId {
  return typeof value === 'string'
    && AVATAR_CATALOG_IDS.includes(value as AvatarCatalogId);
}
