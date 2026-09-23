/** Unknown/legacy configurations remain readable while avatar artwork evolves. */
export function avatarSeed(config: unknown, fallback: string): string {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const value = config as Record<string, unknown>;
    if (value.version === 1 && typeof value.seed === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.seed)) return value.seed;
  }
  return fallback;
}
