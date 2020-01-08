import * as bodyParser from 'body-parser';
import * as express from 'express';

import * as packageJson from '../../package.json';
import { BlogScraper } from '../lib/blog/BlogScraper';

const version = (<any>packageJson).version;
const DEBUG = !!process.env.DEBUG;
const DEFAULT_ARTICLE_COUNT = 3;

const app = express();
app.use(express.static(`${__dirname}/public`));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', `${__dirname}/views`); // views is directory for all template files
app.set('view engine', 'ejs');

app.get('/', (req: express.Request, res: express.Response) => {
  res.render('pages/index', { version });
});

app.get('/extract', async (req: express.Request, res: express.Response) => {
  try {
    const url = req.query.url;
    const service = req.query.service;
    const maxArticles = req.query.maxArticles || DEFAULT_ARTICLE_COUNT;
    const fromDate = req.query.fromDate && new Date(req.query.fromDate);
    const toDate = req.query.toDate && new Date(req.query.toDate);
    const minCommonCharacters = req.query.minCommonCharacters || 0;
    const ascending = req.query.order === 'oldest';
    const keepingImg = req.query.img === 'keeping';
    const option = {
      maxArticles,
      fromDate,
      toDate,
      usingFeedly: service === 'feedly',
      minCommonCharacters,
      ascending,
      keepingImg,
    };
    const result = await BlogScraper.extract(url, option);
    const resultObject: any = { type: result.kind };
    res.set('Content-Type', 'application/json');
    if (result.kind === 'ok') {
      const value = result.value;
      resultObject.value = DEBUG
        ? value
        : {
            siteUrl: value.siteUrl,
            title: value.title,
            author: value.author,
            articles: value.articles.map(a => ({
              url: a.url,
              title: a.title,
              author: a.author,
              date: a.date,
              body: a.content,
            })),
            elapsedMilliseconds: value.elapsedMilliseconds,
          };
    } else {
      resultObject.error = result.error;
      res.status(500);
    }
    res.send(JSON.stringify(resultObject, null, 2));
  } catch (e) {
    console.error(e);
    res.set('Content-Type', 'text/plain');
    res.status(500).send(e.message);
  }
});

app.set('port', process.env.PORT || 5000);
app.listen(app.get('port'), () => {
  console.log('Node app is running on port', app.get('port'));
});
