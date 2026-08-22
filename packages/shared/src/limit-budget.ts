export function capToLimit<T>(items: T[], limit?: number): T[] {
  return limit ? items.slice(0, limit) : items;
}
