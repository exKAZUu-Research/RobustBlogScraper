/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */

import * as Bluebird from 'bluebird';
import * as puppeteer from 'puppeteer';
import * as rp from 'request-promise';
import { UriUtil } from './UriUtil';

const concurrency = 5;
const timeout = 3 * 60 * 1000;
const ignoringResources = ['image', 'media', 'font', 'stylesheet', 'xhr', 'other', 'script'];
const SHOWING_WINDOW = false;

async function getHTMLStringPrivate(browser: puppeteer.Browser, uri: string) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  const domain = UriUtil.getDomainWithoutSuffix(uri);
  page.on('request', async interceptedRequest => {
    if (interceptedRequest.url().includes(domain) && interceptedRequest.resourceType() === 'document') {
      await interceptedRequest.continue();
      // } else if (ignoringResources.indexOf(interceptedRequest.resourceType()) >= 0 ||
      //   interceptedRequest.url().includes('.trackfeed.')) {
      //   interceptedRequest.abort();
    } else {
      await interceptedRequest.abort();
    }
  });

  const response = await page.goto(uri, { timeout });
  //const html = <string>await page.content();
  const html = <string>await page.evaluate(() => document.documentElement.outerHTML);
  if (response.status() > 400 || !html) {
    throw new Error(`Failed to get the HTML document of ${uri} (status code: ${response.status()}).`);
  }
  return { html, page }; // can be used html?
}

export const DownloadUtil = {
  async getRawContent(
    uri: string,
    usingBrowser: boolean = false,
    showingWindow: boolean = SHOWING_WINDOW && !process.env.PORT
  ): Promise<string> {
    if (!usingBrowser) {
      return rp({ uri });
    }

    const browser = await puppeteer.launch({ ignoreHTTPSErrors: true, headless: !showingWindow });
    try {
      const page = await browser.newPage();
      const response = await page.goto(uri, { timeout });
      const content = await response.text();
      if (response.status() > 400 || !content) {
        throw new Error(`Failed to get the raw content of ${uri} (status code: ${response.status()}).`);
      }
      return content;
    } finally {
      await browser.close();
    }
  },
  async getHTMLString(
    uri: string,
    usingBrowser: boolean = false,
    showingWindow: boolean = SHOWING_WINDOW && !process.env.PORT
  ): Promise<string> {
    if (!usingBrowser) {
      return rp({ uri });
    }

    const browser = await puppeteer.launch({ ignoreHTTPSErrors: true, headless: !showingWindow });
    try {
      return (await getHTMLStringPrivate(browser, uri)).html;
    } finally {
      await browser.close();
    }
  },
  async getHTMLStrings(
    uris: string[],
    usingBrowser: boolean = false,
    showingWindow: boolean = SHOWING_WINDOW && !process.env.PORT
  ): Promise<string[]> {
    if (!usingBrowser) {
      return Bluebird.map(uris, uri => rp({ uri }), { concurrency });
    }

    const browser = await puppeteer.launch({ ignoreHTTPSErrors: true, headless: !showingWindow });
    let openedPageCount = 0;
    let error = null;
    const result = await Bluebird.map(
      uris,
      async uri => {
        try {
          openedPageCount++;
          const { html, page } = await getHTMLStringPrivate(browser, uri);
          if (openedPageCount > concurrency) {
            await page.close();
            openedPageCount--;
          }
          return html;
        } catch (e) {
          error = e;
        }
      },
      { concurrency }
    );
    await browser.close();
    if (error != null) {
      throw error;
    }
    return result;
  },
};
