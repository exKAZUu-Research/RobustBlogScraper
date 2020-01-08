import { BlogPreProcessor } from '../../src/lib/blog/BlogPreProcessor';

function makeHtml(innerBody: string) {
  return `<html><head></head><body><article>${innerBody}</article></body></html>`;
}

const ignoredSuffix = 'xxxxxxxxxx';

describe('BlogPreProcessor', () => {
  describe('getHtmlOfInnerMostElement', () => {
    test('should work when there is no search partial content', () => {
      expect(BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml('<p>abc</p><p>def</p>'), `z${ignoredSuffix}`)).toBe(
        null
      );
    });
    test('should work on a single tag', () => {
      expect(BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml('<p>abc</p><p>def</p>'), `a${ignoredSuffix}`)).toBe(
        '<p>abc</p>'
      );
    });
    test('should work on multiple tags', () => {
      expect(BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml('<p>abc</p><p>def</p>'), `abcd${ignoredSuffix}`)).toBe(
        '<article><p>abc</p><p>def</p></article>'
      );
    });
    // test('should work on multiple tags without a first character', () => {
    //   expect(BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml('<p>abc</p><p>def</p>'), `bcd${ignoredSuffix}`)).toBe(
    //     '<article></article>'
    //   );
    // });
    test('should work on multiple tags including all siblings', () => {
      expect(
        BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml('<p>abc</p><p>def</p><p>ghi</p>'), `abcd${ignoredSuffix}`)
      ).toBe('<article><p>abc</p><p>def</p><p>ghi</p></article>');
    });
    test('should work for a single quotation', () => {
      expect(BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml(`<p>'a"a</p><p>def</p>`), `'a${ignoredSuffix}`)).toBe(
        '<p>&apos;a&quot;a</p>'
      );
    });
    test('should work for a double quotation', () => {
      expect(BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml(`<p>'a"a</p><p>def</p>`), `"a${ignoredSuffix}`)).toBe(
        '<p>&apos;a&quot;a</p>'
      );
    });
    test('should work for single and double quotations', () => {
      expect(
        BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml(`<p>'a"a</p><p>def</p>`), `'a"a${ignoredSuffix}`)
      ).toBe('<p>&apos;a&quot;a</p>');
    });
    test('should work for a parenthesis', () => {
      expect(
        BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml(`<p>bbb)aaa</p><p>def</p>`), `bbb)${ignoredSuffix}`)
      ).toBe('<p>bbb)aaa</p>');
    });
    test('should work for a head parenthesis', () => {
      expect(
        BlogPreProcessor.getHtmlOfInnerMostElement(makeHtml(`<p>)aaa</p><p>def</p>`), `)aaa${ignoredSuffix}`)
      ).toBe(`<p>)aaa</p>`);
    });
  });

  describe('removeUnrelatedElements', () => {
    test('should keep div and p without any attribute', () => {
      expect(BlogPreProcessor.removeUnrelatedElements(makeHtml('<div>abc</div><p>def</p>'))).toBe(
        makeHtml('<div>abc</div><p>def</p>')
      );
    });
    // test('should remove div with a first character', () => {
    //   expect(
    //     BlogPreProcessor.removeUnrelatedElements(makeHtml('<div>abc</div><p>def</p>'), 'd')
    //   ).toBe(makeHtml('<p>def</p>'));
    // });
    test('should remove div with webryblog_rakuten_affiliate_box class', () => {
      expect(
        BlogPreProcessor.removeUnrelatedElements(
          makeHtml('<div class="webryblog_rakuten_affiliate_box">abc</div><p>def</p>')
        )
      ).toBe(makeHtml('<p>def</p>'));
    });
    test('should remove p with ldblog_related_articles_5a463303 id', () => {
      expect(
        BlogPreProcessor.removeUnrelatedElements(
          makeHtml('<div>abc</div><p id="ldblog_related_articles_5a463303">def</p>')
        )
      ).toBe(makeHtml('<div>abc</div>'));
    });
  });
});
