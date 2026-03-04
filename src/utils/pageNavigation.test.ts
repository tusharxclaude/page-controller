import { describe, expect, it } from 'vitest';

import { detectPagination, generatePageUrl } from './pageNavigation';

describe('detectPagination — page 0 rejection', () => {
  it('rejects page 0 in path pattern', () => {
    expect(detectPagination('https://example.com/page/0/')).toBeNull();
  });

  it('rejects page 0 in query pattern', () => {
    expect(detectPagination('https://example.com/posts?page=0')).toBeNull();
  });

  it('accepts page 1', () => {
    const result = detectPagination('https://example.com/page/1/');
    expect(result?.currentPage).toBe(1);
  });
});

describe('detectPagination — path pattern /p/ removal', () => {
  it('does NOT detect /p/1 as pagination', () => {
    // After removing /p/ from the path pattern, /u/p/1 is no longer matched as a
    // 'path' pagination. The trailing /1 may still be caught by the simpleNumber
    // pattern — that false positive is handled by the simpleNumber blocklist in Task 3.
    // For now we only assert that the path pattern is no longer responsible.
    const result = detectPagination('https://example.com/u/p/1');
    expect(result?.pattern.type).not.toBe('path');
  });

  it('DOES detect /page/2 as pagination', () => {
    const result = detectPagination('https://example.com/articles/page/2/');
    expect(result?.currentPage).toBe(2);
    expect(result?.pattern.type).toBe('path');
  });

  it('DOES detect /pages/3 as pagination', () => {
    const result = detectPagination('https://example.com/posts/pages/3/');
    expect(result?.currentPage).toBe(3);
    expect(result?.pattern.type).toBe('path');
  });
});

describe('generatePageUrl — leading zeros', () => {
  it('preserves leading zeros for simpleNumber', () => {
    const result = detectPagination('https://example.com/articles/01');
    expect(result).not.toBeNull();
    const newUrl = generatePageUrl(
      'https://example.com/articles/01',
      result!,
      2
    );
    expect(newUrl).toBe('https://example.com/articles/02');
  });

  it('no leading zeros on normal simpleNumber', () => {
    const result = detectPagination('https://example.com/articles/5');
    expect(result).not.toBeNull();
    const newUrl = generatePageUrl(
      'https://example.com/articles/5',
      result!,
      6
    );
    expect(newUrl).toBe('https://example.com/articles/6');
  });

  it('query pattern page replacement is correct', () => {
    const result = detectPagination('https://example.com/posts?page=2');
    expect(result).not.toBeNull();
    const newUrl = generatePageUrl(
      'https://example.com/posts?page=2',
      result!,
      3
    );
    expect(newUrl).toBe('https://example.com/posts?page=3');
  });
});

describe('detectPagination — simpleNumber blocklist', () => {
  const blocklisted: [string, string][] = [
    ['Gmail user 0', 'https://mail.google.com/mail/u/0/#inbox'],
    ['Gmail user 1', 'https://mail.google.com/mail/u/1/'],
    ['GitHub issue', 'https://github.com/user/repo/issues/123'],
    ['GitHub PR', 'https://github.com/user/repo/pull/456'],
    ['Twitter status', 'https://twitter.com/i/status/1234567890'],
    ['Discord channel', 'https://discord.com/channels/123456/789012'],
    ['user profile', 'https://example.com/users/42'],
    ['order detail', 'https://example.com/orders/99'],
  ];

  it.each(blocklisted)('does NOT detect %s as pagination', (_label, url) => {
    expect(detectPagination(url)).toBeNull();
  });

  it('DOES detect a plain numeric path end', () => {
    const result = detectPagination('https://example.com/posts/5');
    expect(result?.currentPage).toBe(5);
    expect(result?.pattern.type).toBe('simpleNumber');
  });

  it('DOES detect numeric path when preceded by non-blocklisted segment', () => {
    const result = detectPagination('https://example.com/archive/3');
    expect(result?.currentPage).toBe(3);
  });
});
