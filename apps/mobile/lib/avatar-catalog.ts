import type { ImageRequireSource } from 'react-native';
import { AVATAR_CATALOG_IDS } from '@/lib/avatar-identity';

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
