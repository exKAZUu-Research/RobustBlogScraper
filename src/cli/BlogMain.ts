import { BlogScraper } from '../lib/blog/BlogScraper';

(async () => {
  const url = process.argv[2];
  const result = await BlogScraper.extract(url, {
    usingFeedly: false,
    maxArticles: 3,
    minCommonCharacters: 0,
  });
  if (result.kind === 'ok') {
    console.log(JSON.stringify(result.value, null, 2));
  } else {
    console.error(result.error);
    process.exit(1);
  }
})().catch();
