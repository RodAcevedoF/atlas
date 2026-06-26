
export interface GdeltArticle {
  url: string;
  url_mobile?: string;
  title: string;
  seendate: string; // compact UTC, e.g. "20260625T120000Z"
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

export interface GdeltDocResponse {
  articles?: GdeltArticle[];
}
