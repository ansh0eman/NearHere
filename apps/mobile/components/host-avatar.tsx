import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AVATAR_CATALOG, AVATAR_RENDER_CATALOG } from '@/lib/avatar-catalog';
import { avatarIndex } from '@/lib/avatar-identity';
import type { AvatarRenderId } from '../../../packages/contracts/avatar';

/** Bundled character art keyed by a stable account seed, never verified identity. */
export function HostAvatar({ seed, avatarId, size = 48 }: { seed: string; avatarId?: AvatarRenderId; size?: number }) {
  const character = avatarId
    ? AVATAR_RENDER_CATALOG.find((item) => item.id === avatarId)
    : AVATAR_CATALOG[avatarIndex(seed, AVATAR_CATALOG.length)];
  const source = character?.source ?? AVATAR_CATALOG[0].source;
  return (
    <View accessible={false} style={[styles.frame, { width: size * 0.72, height: size }]}>
      <Image source={source} contentFit="contain" cachePolicy="memory-disk" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'flex-end' },
  image: { height: '100%', width: '100%' },
});
