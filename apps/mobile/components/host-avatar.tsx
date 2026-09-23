import { StyleSheet, View } from 'react-native';

const COLOURS = ['#BDA8F5', '#92D7BB', '#F1C27D', '#96C8ED', '#E8A9C1'];

/** Original, locally drawn mascot. Seed is visual variety, never verified identity. */
export function HostAvatar({ seed, size = 48 }: { seed: string; size?: number }) {
  const hash = Array.from(seed).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  const colour = COLOURS[hash % COLOURS.length];
  return (
    <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.body, { width: size * 0.82, height: size * 0.84, borderRadius: size * 0.33, backgroundColor: colour }]}>
        <View style={[styles.hair, { width: size * 0.24, height: size * 0.12, top: -size * 0.04, borderRadius: size * 0.1 }]} />
        <View style={[styles.eyes, { gap: size * 0.18, marginTop: size * 0.25 }]}>
          <View style={[styles.eye, { width: size * 0.07, height: size * 0.1 }]} />
          <View style={[styles.eye, { width: size * 0.07, height: size * 0.1 }]} />
        </View>
        <View style={[styles.smile, { width: size * 0.17, height: size * 0.09, marginTop: size * 0.07 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  hair: { position: 'absolute', backgroundColor: '#302842', transform: [{ rotate: '-18deg' }] },
  eyes: { flexDirection: 'row' },
  eye: { backgroundColor: '#302842', borderRadius: 5 },
  smile: { borderBottomWidth: 2, borderColor: '#302842', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
});
