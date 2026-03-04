# Fix Pagination Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all known flaws in the URL pagination detection logic by adopting `<link rel="next">` / `<link rel="prev">` as the primary detection mechanism, tightening URL patterns as fallback, and surfacing accurate `canGoNext` / `canGoPrev` signals.

**Architecture:** New unified `getPageNavigation(url, doc?)` function replaces the three separate exports (`getPageInfo`, `getNextPageUrl`, `getPrevPageUrl`). When `doc` is provided (content script), link-rel is checked first; URL patterns are the fallback. Background script calls with no `doc` and gets URL-only results. The `simpleNumber` URL pattern gets a path-segment blocklist to prevent false positives on known non-pagination paths (Gmail `/u/`, GitHub `/issues/`, etc.).

**Tech Stack:** TypeScript, Vitest (to be added), Vite, webextension-polyfill

---

### Task 1: Install Vitest and wire up test infrastructure

**Files:**

- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `src/utils/pageNavigation.test.ts`

**Step 1: Install Vitest**

```bash
pnpm add -D vitest @vitest/ui jsdom
```

**Step 2: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

**Step 3: Add Vitest config to `vite.config.ts`**

Below the `base: ''` line in the `defineConfig` return value, add:

```ts
test: {
  environment: 'jsdom',
  globals: true,
  include: ['src/**/*.test.ts'],
},
```

Also add `/// <reference types="vitest" />` as the very first line of `vite.config.ts`.

**Step 4: Add vitest types to `tsconfig.json`**

Change the top-level `"types"` array from:

```json
"types": ["chrome", "node"]
```

to:

```json
"types": ["chrome", "node", "vitest/globals"]
```

**Step 5: Create a smoke-test file to verify the setup works**

Create `src/utils/pageNavigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('smoke test', () => {
  it('passes', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 6: Run tests to verify setup**

```bash
pnpm test
```

Expected: `1 passed`

**Step 7: Commit**

```bash
git add package.json vite.config.ts tsconfig.json src/utils/pageNavigation.test.ts pnpm-lock.yaml
git commit -m "chore: add vitest test infrastructure"
```

---

### Task 2: Fix URL pattern bugs — write failing tests first

These are the bugs: page `0` accepted as valid, `/p/` path false positives, and leading zeros detection using wrong capture group.

**Files:**

- Modify: `src/utils/pageNavigation.test.ts`
- Modify: `src/utils/pageNavigation.ts`

**Step 1: Write failing tests for all three bugs**

Replace the smoke test in `src/utils/pageNavigation.test.ts` with:

```ts
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

describe('detectPagination — path pattern /p/ false positive', () => {
  it('does NOT detect /p/1 as pagination (ambiguous)', () => {
    expect(detectPagination('https://example.com/u/p/1')).toBeNull();
  });

  it('DOES detect /page/2 as pagination', () => {
    const result = detectPagination('https://example.com/articles/page/2/');
    expect(result?.currentPage).toBe(2);
  });

  it('DOES detect /pages/3 as pagination', () => {
    const result = detectPagination('https://example.com/posts/pages/3/');
    expect(result?.currentPage).toBe(3);
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
});
```

**Step 2: Run tests — all should fail**

```bash
pnpm test
```

Expected: multiple FAIL

**Step 3: Fix `detectPagination` in `pageNavigation.ts`**

Change the page validity check from:

```ts
if (!Number.isNaN(currentPage) && currentPage >= 0) {
```

to:

```ts
if (!Number.isNaN(currentPage) && currentPage >= 1) {
```

Remove `/p/` from the path pattern regex. Change:

```ts
regex: /\/(page|pages|p)\/(\d+)(\/|$)/i,
```

to:

```ts
regex: /\/(page|pages)\/(\d+)(\/|$)/i,
```

**Step 4: Fix leading zeros detection in `generatePageUrl`**

The current code picks the wrong capture group for non-simpleNumber patterns. Replace the leading zeros block:

```ts
const originalNumber = match[1] || match[2] || match[3];
const hasLeadingZeros =
  originalNumber && originalNumber.length > 1 && originalNumber.startsWith('0');
const formattedPage = hasLeadingZeros
  ? String(newPage).padStart(originalNumber.length, '0')
  : String(newPage);
```

with:

```ts
// Each pattern stores the page number in a different capture group
const numberGroup: Record<string, string | undefined> = {
  query: match[3],
  path: match[2],
  offset: match[3],
  simpleNumber: match[1],
};
const originalNumber = numberGroup[pattern.type] ?? match[1];
const hasLeadingZeros =
  originalNumber !== undefined &&
  originalNumber.length > 1 &&
  originalNumber.startsWith('0');
const formattedPage = hasLeadingZeros
  ? String(newPage).padStart(originalNumber.length, '0')
  : String(newPage);
```

**Step 5: Run tests — all should pass**

```bash
pnpm test
```

Expected: all PASS

**Step 6: Commit**

```bash
git add src/utils/pageNavigation.ts src/utils/pageNavigation.test.ts
git commit -m "fix: reject page 0, remove /p/ path ambiguity, fix leading zeros capture group"
```

---

### Task 3: Add `simpleNumber` blocklist — write failing tests first

Prevents false positives like Gmail `/u/0`, GitHub `/issues/123`, Twitter `/status/123`.

**Files:**

- Modify: `src/utils/pageNavigation.test.ts`
- Modify: `src/utils/pageNavigation.ts`

**Step 1: Add failing tests**

Append to `src/utils/pageNavigation.test.ts`:

```ts
describe('detectPagination — simpleNumber blocklist', () => {
  const blocklisted = [
    ['Gmail user', 'https://mail.google.com/mail/u/0/#inbox'],
    ['Gmail user page 1', 'https://mail.google.com/mail/u/1/'],
    ['GitHub issue', 'https://github.com/user/repo/issues/123'],
    ['GitHub PR', 'https://github.com/user/repo/pull/456'],
    ['Twitter status', 'https://twitter.com/i/status/1234567890'],
    ['Discord channel', 'https://discord.com/channels/123456/789012'],
    ['Amazon product', 'https://www.amazon.com/dp/product/reviews/1'],
    ['User profile', 'https://example.com/users/42'],
    ['Order detail', 'https://example.com/orders/99'],
  ];

  it.each(blocklisted)('does NOT detect %s as pagination', (_label, url) => {
    expect(detectPagination(url)).toBeNull();
  });

  it('DOES detect a plain numeric path end', () => {
    const result = detectPagination('https://example.com/posts/5');
    expect(result?.currentPage).toBe(5);
  });

  it('DOES detect numeric path when preceded by non-blocklisted segment', () => {
    const result = detectPagination('https://example.com/archive/3');
    expect(result?.currentPage).toBe(3);
  });
});
```

**Step 2: Run tests — blocklist tests should fail**

```bash
pnpm test
```

Expected: blocklist tests FAIL (currently all return pagination detected)

**Step 3: Add the blocklist to `pageNavigation.ts`**

Add this constant near the top of the file, after the `PAGINATION_PATTERNS` array:

```ts
/**
 * Path segments that precede numeric IDs which are NOT page numbers.
 * When simpleNumber matches and the segment immediately before the number
 * is in this set, we skip the match.
 */
const SIMPLE_NUMBER_BLOCKLIST = new Set([
  'u', // Gmail /u/0
  'i', // Twitter /i/status
  'status', // Tweet IDs
  'issues', // GitHub issues
  'pull', // GitHub PRs
  'dp', // Amazon product IDs
  'channels', // Discord
  'track', // Shipment tracking
  'user', // Generic user IDs
  'users', // Generic user IDs
  'order', // E-commerce orders
  'orders',
  'comment', // Comment IDs
  'comments',
  'message', // Message IDs
  'messages',
  'thread', // Thread IDs
  'threads',
  'post', // Some CMSes use /post/ID not /post/page
  'attachment',
  'download',
  'file',
  'files',
]);
```

Then in `detectPagination`, inside the `if (match)` block, add the blocklist check for simpleNumber **before** the `switch`:

```ts
if (match) {
  // For simpleNumber, check the path segment immediately before the match
  // to avoid treating resource IDs as page numbers
  if (pattern.type === 'simpleNumber' && match.index !== undefined) {
    const before = url.substring(0, match.index);
    const prevSegment = before.split('/').filter(Boolean).pop() ?? '';
    if (SIMPLE_NUMBER_BLOCKLIST.has(prevSegment.toLowerCase())) {
      continue;
    }
  }

  let currentPage: number;
  // ... existing switch ...
```

**Step 4: Run tests — all should pass**

```bash
pnpm test
```

Expected: all PASS

**Step 5: Commit**

```bash
git add src/utils/pageNavigation.ts src/utils/pageNavigation.test.ts
git commit -m "fix: blocklist known non-pagination path segments for simpleNumber pattern"
```

---

### Task 4: Add `<link rel="next">` detection and unified `getPageNavigation` API

This is the main architectural change. Introduces a new unified function that replaces the three separate exports.

**Files:**

- Modify: `src/utils/pageNavigation.ts`
- Modify: `src/utils/pageNavigation.test.ts`

**Step 1: Write failing tests for link rel detection and new API**

Append to `src/utils/pageNavigation.test.ts`:

```ts
import { JSDOM } from 'jsdom';

import { getPageNavigation } from './pageNavigation';

function makeDoc(html: string): Document {
  return new JSDOM(html).window.document;
}

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

  it('returns not-detected for Gmail URL even with document', () => {
    const doc = makeDoc('<html><head></head></html>');
    const result = getPageNavigation(
      'https://mail.google.com/mail/u/0/#inbox',
      doc
    );
    expect(result.detected).toBe(false);
  });

  it('works without document (URL-only mode for background script)', () => {
    const result = getPageNavigation('https://example.com/articles?page=3');
    expect(result.detected).toBe(true);
    expect(result.currentPage).toBe(3);
    expect(result.nextUrl).toBe('https://example.com/articles?page=4');
    expect(result.prevUrl).toBe('https://example.com/articles?page=2');
  });
});
```

**Step 2: Run tests — all new tests should fail**

```bash
pnpm test
```

Expected: `getPageNavigation` tests FAIL with "not exported"

**Step 3: Add `detectLinkRelPagination` and `getPageNavigation` to `pageNavigation.ts`**

Add the `PageNavigationInfo` interface (replace the existing `PaginationInfo` export if desired, but keep it for now for backward compat):

```ts
export interface PageNavigationInfo {
  detected: boolean;
  currentPage: number | null;
  canGoNext: boolean;
  canGoPrev: boolean;
  nextUrl: string | null;
  prevUrl: string | null;
  patternType: 'link-rel' | 'query' | 'path' | 'offset' | 'simpleNumber' | null;
}
```

Add the link rel detector function:

```ts
/**
 * Checks for explicit pagination links in HTML <head>.
 * These are the most reliable pagination signals available.
 */
function detectLinkRelPagination(
  doc: Document
): { nextUrl: string | null; prevUrl: string | null } | null {
  const nextLink = doc.querySelector(
    'link[rel="next"]'
  ) as HTMLLinkElement | null;
  const prevLink = doc.querySelector(
    'link[rel="prev"], link[rel="previous"]'
  ) as HTMLLinkElement | null;

  if (!nextLink && !prevLink) return null;

  return {
    nextUrl: nextLink ? nextLink.href : null,
    prevUrl: prevLink ? prevLink.href : null,
  };
}
```

Add the unified navigation function:

```ts
/**
 * Primary entry point for pagination detection.
 *
 * When `doc` is provided (content script context), checks for
 * <link rel="next"> / <link rel="prev"> first — the most reliable signal.
 * Falls back to URL pattern matching when link-rel is absent.
 *
 * When `doc` is omitted (background script context), uses URL patterns only.
 */
export function getPageNavigation(
  url: string,
  doc?: Document
): PageNavigationInfo {
  const notDetected: PageNavigationInfo = {
    detected: false,
    currentPage: null,
    canGoNext: false,
    canGoPrev: false,
    nextUrl: null,
    prevUrl: null,
    patternType: null,
  };

  // 1. Link-rel detection (most reliable, requires DOM)
  if (doc) {
    const linkRel = detectLinkRelPagination(doc);
    if (linkRel) {
      // Try URL patterns to surface current page number for the badge
      const urlPagination = detectPagination(url);
      return {
        detected: true,
        currentPage: urlPagination?.currentPage ?? null,
        canGoNext: linkRel.nextUrl !== null,
        canGoPrev: linkRel.prevUrl !== null,
        nextUrl: linkRel.nextUrl,
        prevUrl: linkRel.prevUrl,
        patternType: 'link-rel',
      };
    }
  }

  // 2. URL pattern fallback
  const pagination = detectPagination(url);
  if (!pagination) return notDetected;

  const nextUrl = generatePageUrl(url, pagination, pagination.currentPage + 1);
  const prevUrl =
    pagination.currentPage > 1
      ? generatePageUrl(url, pagination, pagination.currentPage - 1)
      : null;

  return {
    detected: true,
    currentPage: pagination.currentPage,
    canGoNext: true, // unknown without DOM — assume yes
    canGoPrev: pagination.currentPage > 1,
    nextUrl,
    prevUrl,
    patternType: pagination.pattern.type,
  };
}
```

**Step 4: Run tests — all should pass**

```bash
pnpm test
```

Expected: all PASS

**Step 5: Commit**

```bash
git add src/utils/pageNavigation.ts src/utils/pageNavigation.test.ts
git commit -m "feat: add link-rel pagination detection and unified getPageNavigation API"
```

---

### Task 5: Update content script to use `getPageNavigation`

**Files:**

- Modify: `src/content/keyboard.ts`

**Step 1: Update imports**

In `src/content/keyboard.ts`, replace:

```ts
import {
  getNextPageUrl,
  getPageInfo,
  getPrevPageUrl,
} from '@utils/pageNavigation';
```

with:

```ts
import { getPageNavigation } from '@utils/pageNavigation';
```

**Step 2: Update `updateIndicator`**

Replace the call:

```ts
const pageInfo = getPageInfo(window.location.href);
```

with:

```ts
const pageInfo = getPageNavigation(window.location.href, document);
```

The rest of `updateIndicator` uses `pageInfo.detected`, `pageInfo.currentPage`, and `currentSettings` — all still valid.

**Step 3: Update `handleKeyDown` — next page**

Replace the block:

```ts
const currentUrl = window.location.href;
const pageInfo = getPageInfo(currentUrl);

// Handle next page
if (event.key === currentSettings.nextKey) {
  if (!pageInfo.detected) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const nextUrl = getNextPageUrl(currentUrl);
  if (nextUrl) {
    showNotification(`Going to page ${(pageInfo.currentPage || 0) + 1}`, 'success');
    setTimeout(() => {
      window.location.href = nextUrl;
    }, 150);
  }
  return;
}

// Handle previous page
if (event.key === currentSettings.prevKey) {
  if (!pageInfo.detected) {
    return;
  }

  if (!pageInfo.canGoPrev) {
    showNotification('Already on the first page', 'info');
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const prevUrl = getPrevPageUrl(currentUrl);
  if (prevUrl) {
    showNotification(`Going to page ${(pageInfo.currentPage || 2) - 1}`, 'success');
    setTimeout(() => {
      window.location.href = prevUrl;
    }, 150);
  }
}
```

with:

```ts
const currentUrl = window.location.href;
const pageNav = getPageNavigation(currentUrl, document);

// Handle next page
if (event.key === currentSettings.nextKey) {
  if (!pageNav.detected || !pageNav.canGoNext || !pageNav.nextUrl) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const nextPage = pageNav.currentPage !== null ? pageNav.currentPage + 1 : null;
  const label = nextPage !== null ? `Going to page ${nextPage}` : 'Next page';
  showNotification(label, 'success');
  setTimeout(() => {
    window.location.href = pageNav.nextUrl!;
  }, 150);
  return;
}

// Handle previous page
if (event.key === currentSettings.prevKey) {
  if (!pageNav.detected) {
    return;
  }

  if (!pageNav.canGoPrev || !pageNav.prevUrl) {
    showNotification('Already on the first page', 'info');
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const prevPage = pageNav.currentPage !== null ? pageNav.currentPage - 1 : null;
  const label = prevPage !== null ? `Going to page ${prevPage}` : 'Previous page';
  showNotification(label, 'success');
  setTimeout(() => {
    window.location.href = pageNav.prevUrl!;
  }, 150);
}
```

**Step 4: Build to verify no TypeScript errors**

```bash
pnpm build
```

Expected: build succeeds with no errors

**Step 5: Commit**

```bash
git add src/content/keyboard.ts
git commit -m "refactor: update content script to use getPageNavigation with DOM link-rel support"
```

---

### Task 6: Update background script to use `getPageNavigation`

**Files:**

- Modify: `src/background/index.ts`

**Step 1: Update imports**

In `src/background/index.ts`, replace:

```ts
import {
  getNextPageUrl,
  getPageInfo,
  getPrevPageUrl,
} from '@utils/pageNavigation';
```

with:

```ts
import { getPageNavigation } from '@utils/pageNavigation';
```

**Step 2: Update the message handler**

Replace the three message handler blocks:

```ts
if (msg.type === 'getPageInfo' && msg.url) {
  return Promise.resolve(getPageInfo(msg.url));
}
// ...
if (msg.type === 'navigateNext' && msg.url) {
  const nextUrl = getNextPageUrl(msg.url);
  if (nextUrl) {
    return Promise.resolve({ success: true, url: nextUrl });
  }
  return Promise.resolve({ success: false, reason: 'No pagination detected' });
}

if (msg.type === 'navigatePrev' && msg.url) {
  const prevUrl = getPrevPageUrl(msg.url);
  if (prevUrl) {
    return Promise.resolve({ success: true, url: prevUrl });
  }
  return Promise.resolve({
    success: false,
    reason: 'Already on first page or no pagination detected',
  });
}
```

with:

```ts
if (msg.type === 'getPageInfo' && msg.url) {
  return Promise.resolve(getPageNavigation(msg.url));
}

if (msg.type === 'navigateNext' && msg.url) {
  const nav = getPageNavigation(msg.url);
  if (nav.nextUrl) {
    return Promise.resolve({ success: true, url: nav.nextUrl });
  }
  return Promise.resolve({ success: false, reason: 'No pagination detected' });
}

if (msg.type === 'navigatePrev' && msg.url) {
  const nav = getPageNavigation(msg.url);
  if (nav.prevUrl) {
    return Promise.resolve({ success: true, url: nav.prevUrl });
  }
  return Promise.resolve({
    success: false,
    reason: 'Already on first page or no pagination detected',
  });
}
```

**Step 3: Update the keyboard shortcut handler**

Replace:

```ts
if (command === 'navigate-next') {
  const nextUrl = getNextPageUrl(activeTab.url);
  if (nextUrl) {
    await Browser.tabs.update(activeTab.id, { url: nextUrl });
  }
} else if (command === 'navigate-prev') {
  const prevUrl = getPrevPageUrl(activeTab.url);
  if (prevUrl) {
    await Browser.tabs.update(activeTab.id, { url: prevUrl });
  }
}
```

with:

```ts
if (command === 'navigate-next') {
  const nav = getPageNavigation(activeTab.url);
  if (nav.nextUrl) {
    await Browser.tabs.update(activeTab.id, { url: nav.nextUrl });
  }
} else if (command === 'navigate-prev') {
  const nav = getPageNavigation(activeTab.url);
  if (nav.prevUrl) {
    await Browser.tabs.update(activeTab.id, { url: nav.prevUrl });
  }
}
```

**Step 4: Build to verify no TypeScript errors**

```bash
pnpm build
```

Expected: build succeeds with no errors

**Step 5: Commit**

```bash
git add src/background/index.ts
git commit -m "refactor: update background script to use getPageNavigation"
```

---

### Task 7: Remove now-unused exports from `pageNavigation.ts`

`getPageInfo`, `getNextPageUrl`, and `getPrevPageUrl` are no longer used anywhere.

**Files:**

- Modify: `src/utils/pageNavigation.ts`

**Step 1: Delete the three old functions**

Remove the entire `getNextPageUrl`, `getPrevPageUrl`, and `getPageInfo` function bodies and their JSDoc comments from `pageNavigation.ts`. They are replaced by `getPageNavigation`.

**Step 2: Run full test + build**

```bash
pnpm test && pnpm build
```

Expected: all tests PASS, build succeeds

**Step 3: Commit**

```bash
git add src/utils/pageNavigation.ts
git commit -m "refactor: remove deprecated getPageInfo/getNextPageUrl/getPrevPageUrl"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests PASS

**Step 2: Run linter**

```bash
pnpm lint
```

Expected: no errors

**Step 3: Build both targets**

```bash
pnpm build && pnpm build:firefox
```

Expected: both succeed with no TypeScript errors

**Step 4: Manual smoke test checklist**

Load the extension in Chrome from `dist_chrome/` and verify:

- [ ] `https://mail.google.com/mail/u/0/#inbox` → **no badge shown**
- [ ] `https://news.ycombinator.com/news?p=2` → **badge shows page 2**, arrow navigation works
- [ ] A WordPress site with `/page/2/` → **badge shows page 2**, prev/next work
- [ ] A site with `<link rel="next">` in head → **canGoNext is accurate**, badge shown
- [ ] GitHub issue page `github.com/user/repo/issues/123` → **no badge shown**
