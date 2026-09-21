import type { ExactActivityLocation } from '@/types/activity';

export function walkingDirectionsUrl(
  point: ExactActivityLocation,
  platform: 'android' | 'ios',
): string {
  if (platform === 'android') {
    return `geo:${point.latitude},${point.longitude}?q=${point.latitude},${point.longitude}`;
  }
  return `https://maps.apple.com/?daddr=${point.latitude},${point.longitude}&dirflg=w`;
}
