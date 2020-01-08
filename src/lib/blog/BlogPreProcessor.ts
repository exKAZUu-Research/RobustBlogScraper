/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */

import * as cheerio from 'cheerio';
import * as _ from 'lodash';

const REMOVAL_SUFFIX_LEN = 10;
const MAX_RETRY_COUNT = 2;
const ARTICLE_CONTAINER_TAGS = 'div,p,td,article';
const TEXT_CONTAINER_TAGS = `${ARTICLE_CONTAINER_TAGS},span`;
const ATTRIBUTE_NAMES_TO_BE_CHECKED = ['class', 'id'];
const STOP_WORDS_IN_ATTRIBUTE = [
  'affiliate',
  'amazlet',
  'kaereba',
  'relate',
  'nextpage',
  'pagelink',
  'kanren',
  'footer',
  'menu',
  'btnarea',
  'linkarea',
  'paging',
];
const STOP_WORD_REGEX_IN_ATTRIBUTE = /[-_]ads?$/;
const SPACE_REGEX = /\s+/g;

export const BlogPreProcessor = {
  getHtmlOfInnerMostElement(html: string, partialContent: string, title?: string) {
    const partialContentWithoutSpaces = partialContent.replace(SPACE_REGEX, '');
    const titleWithoutSpaces = (title || '').replace(SPACE_REGEX, '');
    let searchString = partialContentWithoutSpaces.slice(0, -REMOVAL_SUFFIX_LEN);
    for (let retryCount = 0; retryCount < MAX_RETRY_COUNT; retryCount++) {
      if (!searchString) {
        break;
      }
      const $ = cheerio.load(html);
      const $elems = $(ARTICLE_CONTAINER_TAGS);
      for (let i = $elems.length - 1; i >= 0; i--) {
        const $elem = $elems.eq(i);
        const textWithoutSpaces = $elem.text().replace(SPACE_REGEX, '');
        if (textWithoutSpaces.includes(searchString) && textWithoutSpaces.includes(titleWithoutSpaces)) {
          removeUnrelatedElementsPrivate($elem, partialContentWithoutSpaces); // TODO: TEXT_CONTAINER_TAGS is needed?
          return cheerio.html($elem);
        }
      }
      searchString = searchString.slice(0, searchString.length / 2);
    }
    return null;
  },
  removeUnrelatedElements(html: string, partialContentWithoutSpaces?: String) {
    const $ = cheerio.load(html);
    removeUnrelatedElementsPrivate($.root(), partialContentWithoutSpaces);
    return $.html();
  },
};

function removeUnrelatedElementsPrivate($elem: Cheerio, partialContentWithoutSpaces?: String) {
  $elem
    .find(TEXT_CONTAINER_TAGS)
    .filter((index: number, element: CheerioElement) => {
      const attrs = ATTRIBUTE_NAMES_TO_BE_CHECKED.map(name => element.attribs[name])
        .filter(attr => !!attr)
        .map(attr => attr.toLowerCase());
      const hasStopWords =
        STOP_WORDS_IN_ATTRIBUTE.some(stopWord =>
          attrs.map(a => a.replace(/-/g, '')).some(attr => attr.includes(stopWord))
        ) || attrs.some(attr => STOP_WORD_REGEX_IN_ATTRIBUTE.test(attr));
      return (
        hasStopWords &&
        (!partialContentWithoutSpaces ||
          !partialContentWithoutSpaces.includes(
            cheerio
              .load(element)
              .root()
              .text()
              .replace(SPACE_REGEX, '')
          ))
      );
    })
    .remove();
}
