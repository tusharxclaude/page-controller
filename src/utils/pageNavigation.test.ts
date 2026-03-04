import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import {
  detectPagination,
  generatePageUrl,
  getPageNavigation,
} from './pageNavigation';

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
    // blocklisted segment 2 levels back (dp -> product-slug -> product-id)
    [
      'JoyBuy product ID',
      'https://www.joybuy.co.uk/dp/yeelight-screen-light-bar-pro-libra/10496164?utm_source=affiliate',
    ],
    ['eBay item', 'https://www.ebay.co.uk/itm/236547961046?var=0&mkevt=1'],
    ['eBay item (plain)', 'https://www.ebay.com/itm/123456789'],
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

function makeDoc(html: string): Document {
  return new JSDOM(html).window.document;
}

describe('getPageNavigation — a[rel] DOM detection', () => {
  it('detects next from <a rel="next"> in body', () => {
    const doc = makeDoc(
      '<html><body><a rel="next" href="https://example.com/page/3">Next</a></body></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.detected).toBe(true);
    expect(result.canGoNext).toBe(true);
    expect(result.nextUrl).toBe('https://example.com/page/3');
    expect(result.patternType).toBe('dom');
  });

  it('detects prev from <a rel="prev"> in body', () => {
    const doc = makeDoc(
      '<html><body><a rel="prev" href="https://example.com/page/1">Prev</a></body></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.detected).toBe(true);
    expect(result.canGoPrev).toBe(true);
    expect(result.prevUrl).toBe('https://example.com/page/1');
    expect(result.patternType).toBe('dom');
  });

  it('supports rel="previous" alias on anchor', () => {
    const doc = makeDoc(
      '<html><body><a rel="previous" href="https://example.com/page/1">Prev</a></body></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.canGoPrev).toBe(true);
    expect(result.prevUrl).toBe('https://example.com/page/1');
  });

  it('link-rel in head takes priority over a[rel] in body', () => {
    const doc = makeDoc(
      '<html><head><link rel="next" href="https://example.com/page/3-head"></head>' +
        '<body><a rel="next" href="https://example.com/page/3-body">Next</a></body></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.nextUrl).toBe('https://example.com/page/3-head');
    expect(result.patternType).toBe('link-rel');
  });
});

describe('getPageNavigation — ARIA pagination detection', () => {
  it('finds next link inside aria-label="pagination" nav', () => {
    const doc = makeDoc(
      '<html><body>' +
        '<nav aria-label="pagination">' +
        '  <a href="/page/1">1</a>' +
        '  <a href="/page/2" aria-current="page">2</a>' +
        '  <a href="/page/3" aria-label="Next page">Next</a>' +
        '</nav>' +
        '</body></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.detected).toBe(true);
    expect(result.canGoNext).toBe(true);
    expect(result.nextUrl).toBe('/page/3');
    expect(result.patternType).toBe('dom');
  });

  it('finds prev link inside aria-label="pagination" nav', () => {
    const doc = makeDoc(
      '<html><body>' +
        '<nav aria-label="pagination">' +
        '  <a href="/page/1" aria-label="Previous page">Prev</a>' +
        '  <a href="/page/2" aria-current="page">2</a>' +
        '</nav>' +
        '</body></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.canGoPrev).toBe(true);
    expect(result.prevUrl).toBe('/page/1');
  });

  it('matches aria-label case-insensitively (Pagination, PAGINATION)', () => {
    const doc = makeDoc(
      '<html><body>' +
        '<nav aria-label="Page Navigation">' +
        '  <a href="/page/3" aria-label="Next">Next</a>' +
        '</nav>' +
        '</body></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.detected).toBe(true);
    expect(result.nextUrl).toBe('/page/3');
  });

  it('returns not-detected when ARIA nav has no next/prev links', () => {
    const doc = makeDoc(
      '<html><body>' +
        '<nav aria-label="pagination">' +
        '  <a href="/page/1">1</a>' +
        '  <a href="/page/2">2</a>' +
        '</nav>' +
        '</body></html>'
    );
    // No next/prev aria-labels — should fall through to URL patterns
    const result = getPageNavigation('https://example.com/page/2/', doc);
    // URL pattern should pick it up as fallback
    expect(result.detected).toBe(true);
    expect(result.patternType).toBe('path');
  });
});

describe('getPageNavigation — link rel detection', () => {
  it('detects next from <link rel="next">', () => {
    const doc = makeDoc(
      '<html><head><link rel="next" href="https://example.com/page/3"></head></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.detected).toBe(true);
    expect(result.canGoNext).toBe(true);
    expect(result.nextUrl).toBe('https://example.com/page/3');
    expect(result.patternType).toBe('link-rel');
  });

  it('detects prev from <link rel="prev">', () => {
    const doc = makeDoc(
      '<html><head><link rel="prev" href="https://example.com/page/1"></head></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.canGoPrev).toBe(true);
    expect(result.prevUrl).toBe('https://example.com/page/1');
  });

  it('sets canGoNext=false when no <link rel="next"> exists', () => {
    const doc = makeDoc(
      '<html><head><link rel="prev" href="https://example.com/page/1"></head></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.canGoNext).toBe(false);
    expect(result.nextUrl).toBeNull();
  });

  it('falls back to URL patterns when no link rel found', () => {
    const doc = makeDoc('<html><head></head></html>');
    const result = getPageNavigation('https://example.com/page/2/', doc);
    expect(result.detected).toBe(true);
    expect(result.patternType).toBe('path');
    expect(result.currentPage).toBe(2);
  });

  it('returns not-detected for Gmail URL even with empty document', () => {
    const doc = makeDoc('<html><head></head></html>');
    const result = getPageNavigation(
      'https://mail.google.com/mail/u/0/#inbox',
      doc
    );
    expect(result.detected).toBe(false);
  });

  it('works without document (URL-only mode)', () => {
    const result = getPageNavigation('https://example.com/articles?page=3');
    expect(result.detected).toBe(true);
    expect(result.currentPage).toBe(3);
    expect(result.nextUrl).toBe('https://example.com/articles?page=4');
    expect(result.prevUrl).toBe('https://example.com/articles?page=2');
  });

  it('also supports rel="previous" as alias', () => {
    const doc = makeDoc(
      '<html><head><link rel="previous" href="https://example.com/page/1"></head></html>'
    );
    const result = getPageNavigation('https://example.com/page/2', doc);
    expect(result.canGoPrev).toBe(true);
    expect(result.prevUrl).toBe('https://example.com/page/1');
  });
});
