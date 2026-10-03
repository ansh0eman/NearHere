import type { ImageRequireSource } from 'react-native';
import { AVATAR_CATALOG_IDS } from '@/lib/avatar-identity';
import type { AvatarCatalogId, AvatarRenderId, KenneyAppearanceId } from '../../../packages/contracts/avatar';

// Catalog order is part of the stable seed mapping. Append new catalog versions;
// don't reorder these entries after an avatar identity has been issued.
export const AVATAR_CATALOG_VERSION = 1;
export const AVATAR_CATALOG: readonly { id: (typeof AVATAR_CATALOG_IDS)[number]; source: ImageRequireSource }[] = [
  { id: 'v1-01', source: require('../assets/avatars/v1/v1-01.png') },
  { id: 'v1-02', source: require('../assets/avatars/v1/v1-02.png') },
  { id: 'v1-03', source: require('../assets/avatars/v1/v1-03.png') },
  { id: 'v1-04', source: require('../assets/avatars/v1/v1-04.png') },
  { id: 'v1-05', source: require('../assets/avatars/v1/v1-05.png') },
  { id: 'v1-06', source: require('../assets/avatars/v1/v1-06.png') },
];

/**
 * These four looks are compiled from selected CC0 Kenney source layers. They
 * are intentionally literal imports: Metro can see and bundle every image.
 */
export const KENNEY_APPEARANCE_CATALOG: readonly {
  id: KenneyAppearanceId;
  fallbackAvatarId: AvatarCatalogId;
  source: ImageRequireSource;
}[] = [
  { id: 'kenney-01', fallbackAvatarId: 'v1-01', source: require('../assets/avatars/kenney-v1/compiled/kenney-01.png') },
  { id: 'kenney-02', fallbackAvatarId: 'v1-02', source: require('../assets/avatars/kenney-v1/compiled/kenney-02.png') },
  { id: 'kenney-03', fallbackAvatarId: 'v1-03', source: require('../assets/avatars/kenney-v1/compiled/kenney-03.png') },
  { id: 'kenney-04', fallbackAvatarId: 'v1-04', source: require('../assets/avatars/kenney-v1/compiled/kenney-04.png') },
  { id: 'kenney-05', fallbackAvatarId: 'v1-05', source: require('../assets/avatars/kenney-v1/compiled/kenney-05.png') },
  { id: 'kenney-06', fallbackAvatarId: 'v1-06', source: require('../assets/avatars/kenney-v1/compiled/kenney-06.png') },
  { id: 'kenney-07', fallbackAvatarId: 'v1-01', source: require('../assets/avatars/kenney-v1/compiled/kenney-07.png') },
  { id: 'kenney-08', fallbackAvatarId: 'v1-02', source: require('../assets/avatars/kenney-v1/compiled/kenney-08.png') },
];

export const AVATAR_RENDER_CATALOG: readonly { id: AvatarRenderId; source: ImageRequireSource }[] = [
  ...AVATAR_CATALOG,
  ...KENNEY_APPEARANCE_CATALOG,
];

export function avatarImageSource(id: AvatarRenderId): ImageRequireSource {
  return AVATAR_RENDER_CATALOG.find((item) => item.id === id)?.source ?? AVATAR_CATALOG[0].source;
}
