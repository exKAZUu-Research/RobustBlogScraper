/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import * as Bluebird from 'bluebird';
import * as cheerio from 'cheerio';
import * as _ from 'lodash';
import * as sanitizeHtml from 'sanitize-html';
import * as xml2js from 'xml2js';
import * as xpath from 'xml2js-xpath';
import { DownloadUtil } from '../net/DownloadUtil';
import { UriUtil } from '../net/UriUtil';
import { Article, WebSite } from '../Types';
import * as diffFinder from '../vdom/DiffFinder';
import { Element } from '../vdom/Element';
import { TreeNode } from '../vdom/TreeNode';
import { BlogPostProcessor } from './BlogPostProcessor';
import { BlogPreProcessor } from './BlogPreProcessor';

interface ExtractOption {
  usingFeedly: boolean;
  maxArticles: number;
  fromDate?: Date;
  toDate?: Date;
  ascending?: boolean;
  minCommonCharacters: number;
  keepingImg?: boolean;
  metric?: string;
  forcingDiff?: boolean;
}

type Result<T> = { kind: 'ok'; value: T } | { kind: 'failed'; error: string };

const USE_BROWSER_FOR_TOP = true;
const USE_BROWSER_FOR_ARTICLE = true;

export const BlogScraper = {
  async extract(url: string, option: ExtractOption): Promise<Result<WebSite>> {
    const startTime = Date.now();

    const domain = UriUtil.getDomainWithoutSuffix(url);
    let html: string;
    try {
      html = await DownloadUtil.getHTMLString(url, USE_BROWSER_FOR_TOP);
    } catch (e) {
      return constructErrorResult('トップページの取得に失敗しました。', e, url);
    }
    const $ = cheerio.load(html);
    const site: WebSite = {
      siteUrl: url,
      title: $('title').text(),
      rssUrl: '',
      author: '',
      articles: [],
      elapsedMilliseconds: 0,
    };

    const rssCandidates: string[] = [];
    $('[type="application/rss+xml"]').each((i, elem) => {
      const rssUrl = $(elem)
        .attr('href')
        .trim();
      if (!rssUrl) {
        return;
      }
      rssCandidates.push(rssUrl);
    });
    if (!rssCandidates.length) {
      rssCandidates.push(`${url}${url.endsWith('/') ? '' : '/'}feed`);
    }

    for (const rssUrl of rssCandidates) {
      try {
        const articles = await processRssOrFeedly(rssUrl, site, option);
        if (articles !== null) {
          try {
            await processArticles(site, articles, domain, option);
          } catch (e) {
            return constructErrorResult('記事の取得に失敗しました。', e, rssUrl);
          }
          break;
        }
      } catch (e) {
        return constructErrorResult('RSSの取得に失敗しました。', e, rssUrl);
      }
    }

    site.elapsedMilliseconds = Date.now() - startTime;
    return { kind: 'ok', value: site };
  },
};

function constructErrorResult(msg: string, e: Error, url: string): Result<WebSite> {
  return { kind: 'failed', error: `${msg}\nURL: ${url}\nエラー詳細: ${e.message}\nStack trace: ${e.stack}` };
}

const INCOMPLETENESS_REGEX = /\.{3}|…|続きを読む/;
const MAX_CONTENT_LEN = 200;
const SUFFIX_LEN = 10;

function isExtractingContentsFromHTML(articles: Article[]) {
  const onlyOneArticle = articles.length <= 1;
  const hasEmptyContent = articles.some(a => !a.content);
  const hasIncompleteContent = articles.some(a => INCOMPLETENESS_REGEX.test(a.content.slice(-SUFFIX_LEN)));
  const allContentsTooShort = articles.every(a => a.content.length <= MAX_CONTENT_LEN);
  return !onlyOneArticle && (hasEmptyContent || hasIncompleteContent || allContentsTooShort);
}

const EXCLUDING_IMG = { allowedTags: <string[]>[], allowedAttributes: {} };
const INCLUDING_IMG = { allowedTags: ['img'], allowedAttributes: { img: ['src', 'alt', 'height', 'width'] } };

function normalizeRssContent(content: string, title: string, option: ExtractOption) {
  let ret = _.unescape(sanitizeHtml(content, option.keepingImg ? INCLUDING_IMG : EXCLUDING_IMG))
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedTitle = (title || '').trim();
  if (normalizedTitle && ret.endsWith(normalizedTitle)) {
    // Some rss records include a normalizedTitle on the tail of a content
    ret = ret.substr(0, ret.length - normalizedTitle.length).trim();
  }
  return ret;
}

async function processRssOrFeedly(rssUrl: string, site: WebSite, option: ExtractOption): Promise<Article[]> {
  if (!option.usingFeedly) {
    const rssText = await DownloadUtil.getRawContent(rssUrl, true);
    return processRss(rssUrl, rssText, site, option);
  }

  let feedlyUrl = `https://cloud.feedly.com/v3/streams/contents?streamId=feed/${rssUrl}`;
  if (option.fromDate) {
    feedlyUrl += `&newerThan=${option.fromDate.getTime()}`;
  }
  if (option.ascending) {
    feedlyUrl += `&ranked=oldest`;
  }
  const responseText = await DownloadUtil.getRawContent(feedlyUrl, false);
  return processFeedly(responseText, site, option);
}

async function processRss(rssUrl: string, rssText: string, site: WebSite, option: ExtractOption): Promise<Article[]> {
  const rss: any = await new Promise((resolve, reject) => {
    const parseOption = { tagNameProcessors: [xml2js.processors.stripPrefix] };
    xml2js.parseString(rssText, parseOption, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });

  const channelList = xpath.find(rss, '//channel');
  if (!channelList.length) {
    return null;
  }

  const channel = channelList[0];
  site.rssUrl = rssUrl;
  site.title = safeToString(channel.title) || site.title;
  site.author = safeToString(channel.creator);

  const items = xpath.find(rss, '//item');
  if (items.length === 0) {
    return [];
  }

  const sign = option.ascending ? 1 : -1;
  return items
    .map((item: any): Article => {
      const title = safeToString(item.title);
      const date = item.date || item.pubDate;
      return {
        url: safeToString(item.link),
        title,
        author: safeToString(item.creator),
        date: date ? new Date(date) : null,
        extractMethod: 'rss',
        content: normalizeRssContent(item.encoded || item.description, title, option),
      };
    })
    .sort((a1, a2) => {
      if (a1.date && a2.date) {
        return sign * (a1.date.getTime() - a2.date.getTime());
      }
    });
}

async function processFeedly(responseText: string, page: WebSite, option: ExtractOption): Promise<Article[]> {
  const response = JSON.parse(responseText);
  if (!response || !response.items || !response.items.length) {
    return null;
  }

  page.rssUrl = response.id.substring('feed/'.length);
  page.title = response.title || page.title;

  return response.items.map((item: any) => {
    const article = {
      url: (item.alternate.find((e: any) => e.href) || {}).href || item.originId,
      title: item.title,
      author: item.author,
      date: new Date(+item.published),
      extractMethod: 'feedly',
      content: '',
    };
    const contentOrSummary = item.content || item.summary;
    if (contentOrSummary) {
      const content = normalizeRssContent(contentOrSummary.content, article.title, option);
      if (content) {
        article.content = content;
      }
    }
    return article;
  });
}

async function processArticles(page: WebSite, articles: Article[], domain: string, option: ExtractOption) {
  const maxArticles = option.maxArticles;
  const inRange = buildPredication(option);
  const chosenArticles = articles.filter(
    a => a.date && inRange(a.date) && UriUtil.getDomainWithoutSuffix(a.url) === domain
  );
  if (chosenArticles.length > maxArticles) {
    chosenArticles.splice(maxArticles, chosenArticles.length);
  }

  // determine to scrape & diff or not
  const usingDiff = option.forcingDiff || isExtractingContentsFromHTML(articles) || articles.some(a => !a.content);
  if (usingDiff) {
    const htmlStrings = await DownloadUtil.getHTMLStrings(chosenArticles.map(a => a.url), USE_BROWSER_FOR_ARTICLE);
    chosenArticles.forEach((article, i) => {
      if (article.content) {
        article.partialHtml = BlogPreProcessor.getHtmlOfInnerMostElement(
          htmlStrings[i],
          article.content,
          article.title
        );
      }
      article.html = BlogPreProcessor.removeUnrelatedElements(htmlStrings[i]);
    });
    await Bluebird.map(chosenArticles, async article => {
      if (article.partialHtml) {
        const anotherArticle = chosenArticles.find(a => a !== article && !!a.partialHtml);
        if (anotherArticle) {
          article.content = getDiff([article.partialHtml, anotherArticle.partialHtml], option);
          article.extractMethod = 'scrape';
        }
      } else {
        const anotherArticle = chosenArticles.find(a => a !== article && !!a.html) || articles.find(a => a !== article);
        if (anotherArticle) {
          anotherArticle.html =
            anotherArticle.html || (await DownloadUtil.getHTMLString(anotherArticle.url, USE_BROWSER_FOR_ARTICLE));
          article.content = getDiff([article.html, anotherArticle.html], option);
          article.extractMethod = 'scrape';
        }
      }
    });
  }
  BlogPostProcessor.cleanupArticles(chosenArticles, option.minCommonCharacters);
  page.articles = chosenArticles;
}

function buildPredication(option: ExtractOption): ((date: Date) => boolean) {
  if (option.fromDate) {
    const fromDate = isoDate(option.fromDate);
    if (option.toDate) {
      const to = isoDate(option.toDate);
      return (date: Date) => {
        const s = isoDate(date);
        return fromDate <= s && s <= to;
      };
    }
    return date => fromDate <= isoDate(date);
  } else if (option.toDate) {
    const toDate = isoDate(option.toDate);
    return date => isoDate(date) <= toDate;
  }
  return () => true;
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDiff(htmlStrings: string[], option: ExtractOption): string {
  const candidates = diffFinder.findCandidates(htmlStrings, { includeElement: true });
  const elems = candidates.map(c => c.row[0]);

  let metricFunc = (elem: Element) => 1; //elem.toText().length;
  if (option.metric === 'textSize') {
    metricFunc = (elem: Element) => elem.toText().length;
  } else if (option.metric === 'htmlSize') {
    metricFunc = (elem: Element) => elem.toHTML().length;
  } else if (option.metric === 'elementCount') {
    metricFunc = () => 1;
  }

  const trunk = TreeNode.BUILD_TREE(elems, metricFunc);
  const threshold = trunk.totalWeight * 0.5;
  if (trunk) {
    const content = trunk.getMainContent(elems[0].source, threshold, true);
    return _.unescape(sanitizeHtml(content, option.keepingImg ? INCLUDING_IMG : EXCLUDING_IMG));
  }
  return '';
}

function safeToString(arg: any): string {
  return arg ? arg.toString() : '';
}
