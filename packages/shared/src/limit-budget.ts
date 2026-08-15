export function perSourceLimit<T extends { limit?: number }>(
  filter: T | undefined,
  sourceCount: number,
): T | undefined {
  if (!filter?.limit) return filter;
  return { ...filter, limit: Math.ceil(filter.limit / sourceCount) };
}

export function capToLimit<T>(items: T[], limit?: number): T[] {
  return limit ? items.slice(0, limit) : items;
}
