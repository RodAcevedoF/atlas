import type { MarketCategory } from "@atlas/domain";

const CATEGORY_ALIASES: Array<{
  category: MarketCategory;
  aliases: readonly string[];
}> = [
  { category: "politics", aliases: ["politics", "political", "elections"] },
  { category: "crypto", aliases: ["crypto", "cryptocurrency"] },
  { category: "sports", aliases: ["sports"] },
  { category: "economics", aliases: ["economics", "economy", "finance"] },
  { category: "science", aliases: ["science", "technology", "tech"] },
  { category: "culture", aliases: ["culture", "entertainment"] },
];

export function mapCategory(category: string | undefined): MarketCategory {
  if (!category) return "other";
  const normalized = category.toLowerCase();

  for (const entry of CATEGORY_ALIASES) {
    if (entry.aliases.includes(normalized)) return entry.category;
  }

  return "other";
}
