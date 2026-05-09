export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  source: string;
  relevanceScore?: number;
}

export interface NewsFilter {
  query: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface NewsPort {
  search(filter: NewsFilter): Promise<NewsArticle[]>;
}
