import { BlogPostProcessor } from '../../src/lib/blog/BlogPostProcessor';

const { prevIndex, nextIndex, removeCommonText } = BlogPostProcessor;

describe('prevIndex', () => {
  test('should work', () => {
    expect(prevIndex(7, 'abcdefg')).toBe(6);
    expect(prevIndex(6, 'abcdefg')).toBe(5);
    expect(prevIndex(5, 'abcdefg')).toBe(4);

    expect(prevIndex(2, 'a ')).toBe(0);
    expect(prevIndex(3, 'a a')).toBe(2);
    expect(prevIndex(2, 'a a')).toBe(0);

    expect(prevIndex(3, 'a  ')).toBe(0);
    expect(prevIndex(4, 'a  a')).toBe(3);
    expect(prevIndex(3, 'a  a')).toBe(0);
  });
});

describe('nextIndex', () => {
  test('should work', () => {
    expect(nextIndex(-1, 'abcdefg')).toBe(0);
    expect(nextIndex(0, 'abcdefg')).toBe(1);
    expect(nextIndex(1, 'abcdefg')).toBe(2);

    expect(nextIndex(-1, ' a')).toBe(1);
    expect(nextIndex(-1, 'a a')).toBe(0);
    expect(nextIndex(0, 'a a')).toBe(2);

    expect(nextIndex(-1, '  a')).toBe(2);
    expect(nextIndex(-1, 'a  a')).toBe(0);
    expect(nextIndex(0, 'a  a')).toBe(3);
  });
});

describe('removeCommonText', () => {
  test('should work', () => {
    expect(removeCommonText([], 0)).toEqual([]);
    expect(removeCommonText(['a'], 0)).toEqual(['a']);
    expect(removeCommonText(['a', 'b'], 0)).toEqual(['a', 'b']);

    // ----- prefix
    expect(removeCommonText(['xa', 'xb'], 0)).toEqual(['a', 'b']);
    expect(removeCommonText(['x', 'x'], 0)).toEqual(['', '']);
    expect(removeCommonText(['xa', 'x'], 0)).toEqual(['a', '']);
    expect(removeCommonText(['x', 'xa'], 0)).toEqual(['', 'a']);

    expect(removeCommonText(['xya', 'xyb', 'xyc'], 0)).toEqual(['a', 'b', 'c']);
    expect(removeCommonText(['xya', 'xyb', 'xzc'], 0)).toEqual(['ya', 'yb', 'zc']);

    expect(removeCommonText(['x a', 'xb'], 0)).toEqual(['a', 'b']);
    expect(removeCommonText(['x     a', 'xb'], 0)).toEqual(['a', 'b']);
    expect(removeCommonText(['a', '     a'], 0)).toEqual(['', '']);

    // ----- suffix
    expect(removeCommonText(['ax', 'bx'], 0)).toEqual(['a', 'b']);
    expect(removeCommonText(['ax', 'bx', 'cx'], 0)).toEqual(['a', 'b', 'c']);
    expect(removeCommonText(['axz', 'bxz', 'cxz'], 0)).toEqual(['a', 'b', 'c']);
    expect(removeCommonText(['axz', 'bxz', 'cyz'], 0)).toEqual(['ax', 'bx', 'cy']);

    expect(removeCommonText(['a x', 'bx'], 0)).toEqual(['a', 'b']);
    expect(removeCommonText(['a            x', 'bx'], 0)).toEqual(['a', 'b']);
    expect(removeCommonText(['a x', 'b  x'], 0)).toEqual(['a', 'b']);

    // ----- both
    expect(removeCommonText(['  a xyz', ' b  x y z'], 0)).toEqual(['a', 'b']);
    expect(removeCommonText(['     a', 'a     '], 0)).toEqual(['', '']);

    // -- minCommonCharacters
    expect(removeCommonText(['xa', 'xb'], 1)).toEqual(['xa', 'xb']);
    expect(removeCommonText(['xaxx', 'xbxx'], 1)).toEqual(['xa', 'xb']);
    expect(removeCommonText(['xxax', 'xxbx'], 1)).toEqual(['ax', 'bx']);
    expect(removeCommonText(['xax', 'xbx'], 1)).toEqual(['xax', 'xbx']);
    expect(removeCommonText(['xxaxx', 'xxbxx'], 1)).toEqual(['a', 'b']);
  });
});
