/*
 * Copyright (C) National Institute of Informatics - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 */
import { Article } from '../Types';

const MAX_TAIL_OF_SENTENCE_LEN = 5;

export const BlogPostProcessor = {
  cleanupArticles(articles: Article[], minCommonCharacters: number): void {
    const cleanContents = BlogPostProcessor.removeCommonText(articles.map(a => a.content), minCommonCharacters);
    articles.forEach((a, index) => {
      a.content = cleanContents[index];
    });
  },
  removeCommonText(texts: string[], minCommonCharacters: number): string[] {
    if (texts.length <= 1) {
      return texts;
    }
    const [startIndexes, startCount] = getCommonText(texts, () => -1, BlogPostProcessor.nextIndex);
    const [endIndexes, endCount] = getCommonText(texts, text => text.length, BlogPostProcessor.prevIndex);
    return texts.map((str, i) => {
      const s = startCount > minCommonCharacters ? startIndexes[i] : 0;
      let e = endCount > minCommonCharacters ? endIndexes[i] + 1 : str.length;
      if (s >= e) {
        return '';
      }
      // Keep the tail of a sentence like "ます。"
      const tail = str.substring(e);
      const indexes = ['。', '！', '♪', '」', '）'].map(sign => tail.indexOf(sign)).filter(index => index >= 0);
      const index = Math.min(...indexes);
      if (index !== -1 && index < MAX_TAIL_OF_SENTENCE_LEN) {
        e += index + 1;
      }
      return str.substring(s, e).trim();
    });
  },
  nextIndex(currentIndex: number, str: string): number {
    let next = currentIndex + 1;
    while (next < str.length && canIgnore(str[next])) {
      next++;
    }
    return next;
  },
  prevIndex(currentIndex: number, str: string): number {
    let prev = currentIndex - 1;
    while (prev >= 0 && canIgnore(str[prev])) {
      prev--;
    }
    return prev;
  },
};

function getCommonText(
  texts: string[],
  initialIndex: (text: string) => number,
  nextIndexFunc: (currentIndex: number, text: string) => number
): [number[], number] {
  let count = 0;
  let indexes = texts.map(text => nextIndexFunc(initialIndex(text), text));
  const firstText = texts[0];
  for (;;) {
    const ch = firstText[indexes[0]];
    if (ch && texts.every((text, i) => ch === text[indexes[i]])) {
      indexes = indexes.map((index, i) => nextIndexFunc(index, texts[i]));
      count++;
    } else {
      return [indexes, count];
    }
  }
}

function canIgnore(ch: string): boolean {
  return ch === ' ' || ch === '　' || ch === '。';
}
