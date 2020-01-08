export interface WebSite {
  siteUrl: string;
  title: string;
  rssUrl: string;
  author: string;
  articles: Article[];
  elapsedMilliseconds: number;
}

export interface Article {
  url: string;
  title: string;
  author: string;
  date: Date | null;
  extractMethod: 'rss' | 'feedly' | 'scrape';
  content: string;
  html?: string;
  partialHtml?: string;
}
