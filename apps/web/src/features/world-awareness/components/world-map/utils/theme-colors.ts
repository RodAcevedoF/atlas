const resolved = new Map<string, string>();

function resolveToken(token: string): string {
  const name = token
    .replace(/^var\(/, "")
    .replace(/\)$/, "")
    .trim();
  const cached = resolved.get(name);
  if (cached) return cached;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (value) resolved.set(name, value);
  return value;
}

export function orbRimHex(): string {
  return resolveToken("--card-foreground");
}

export function orbShadowHex(): string {
  return resolveToken("--card-deep");
}

export function mapWaterHex(): string {
  return resolveToken("--map-water");
}

export function mapLandHex(): string {
  return resolveToken("--map-land");
}

export function orbRampHexes(): string[] {
  return [
    resolveToken("--map-orb-quietest"),
    resolveToken("--map-orb-quiet"),
    resolveToken("--map-orb-mid"),
    resolveToken("--map-orb-loud"),
    resolveToken("--map-orb-loudest"),
  ];
}
