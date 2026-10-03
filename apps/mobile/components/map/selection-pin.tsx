import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

/**
 * A non-interactive map-center marker. The tip and the target reticle sit on
 * the same coordinate, so moving the map has an unambiguous selection point.
 */
export function SelectionPin() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.target}>
        <View style={styles.targetCore} />
      </View>
      <View style={styles.marker}>
        <Ionicons color={colors.mapPin} name="location-sharp" size={68} />
        <View style={styles.markerCore} />
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  wrap: {
    height: 76,
    left: '50%',
    marginLeft: -38,
    marginTop: -68,
    position: 'absolute',
    top: '50%',
    width: 76,
  },
  target: {
    alignItems: 'center',
    backgroundColor: `${colors.canvas}E8`,
    borderColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    bottom: 0,
    height: 20,
    justifyContent: 'center',
    left: 28,
    position: 'absolute',
    width: 20,
  },
  targetCore: {
    backgroundColor: colors.mapPin,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  marker: {
    alignItems: 'center',
    height: 68,
    justifyContent: 'flex-start',
    left: 4,
    position: 'absolute',
    top: 0,
    width: 68,
  },
  markerCore: {
    backgroundColor: colors.canvas,
    borderColor: colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    left: 26,
    position: 'absolute',
    top: 18,
    width: 16,
  },
  });
}
