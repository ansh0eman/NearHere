import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import nightArcade from '@/assets/maps/nearhere-night-arcade-v1.json';
import type { AppTheme } from '@/lib/theme';
import { makeMapStyleFrom } from '@/lib/map-style-core.mjs';

// Recolor only reviewed cartographic constants. The pure core is Node-testable;
// this adapter loads the native app asset through Metro's asset resolver.
export function makeMapStyle(theme: AppTheme): StyleSpecification {
  return makeMapStyleFrom(nightArcade, theme) as StyleSpecification;
}
