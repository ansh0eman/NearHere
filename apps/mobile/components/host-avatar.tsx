import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AVATAR_CATALOG } from '@/lib/avatar-catalog';
import { avatarIndex, isAvatarCatalogId } from '@/lib/avatar-identity';
import type { AvatarCatalogId } from '../../../packages/contracts/avatar';

/** Bundled character art keyed by a stable account seed, never verified identity. */
export function HostAvatar({ seed, avatarId, size = 48 }: { seed: string; avatarId?: AvatarCatalogId; size?: number }) {
  const selectedIndex = isAvatarCatalogId(avatarId)
    ? AVATAR_CATALOG.findIndex((item) => item.id === avatarId)
    : avatarIndex(seed, AVATAR_CATALOG.length);
  const character = AVATAR_CATALOG[selectedIndex >= 0 ? selectedIndex : 0];
  return (
    <View accessible={false} style={[styles.frame, { width: size * 0.72, height: size }]}>
      <Image source={character.source} contentFit="contain" cachePolicy="memory-disk" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'flex-end' },
  image: { height: '100%', width: '100%' },
});
