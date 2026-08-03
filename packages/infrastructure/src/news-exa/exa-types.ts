export interface ExaSearchRequest {
  query: string;
  type?: "auto" | "neural" | "keyword";
  category?: string;
  numResults?: number;
  startPublishedDate?: string;
  endPublishedDate?: string;
}

export interface ExaResult {
  id: string;
  url: string;
  title: string | null;
  publishedDate?: string;
  author?: string;
  score?: number;
}

export interface ExaSearchResponse {
  results?: ExaResult[];
}
