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

export function primaryHex(): string {
  return resolveToken("--primary");
}

export function emptyFillHex(): string {
  return resolveToken("--map-empty-fill");
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
