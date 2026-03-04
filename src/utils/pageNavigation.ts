/**
 * Page Navigation Utility
 * Detects pagination patterns in URLs and provides navigation functions
 */

// Common pagination patterns in URLs (ordered by specificity - more specific first)
const PAGINATION_PATTERNS = [
  // Query parameter patterns: ?page=1, ?p=1, ?paged=1, ?pg=1, ?pagenum=1
  {
    regex: /([?&])(page|p|paged|pg|pagenum|pagenumber|current_page)=(\d+)/i,
    type: 'query' as const,
  },
  // Path patterns: /page/1, /p/1, /pages/1
  {
    regex: /\/(page|pages)\/(\d+)(\/|$)/i,
    type: 'path' as const,
  },
  // Offset patterns: ?offset=10 (assume 10 per page)
  {
    regex: /([?&])(offset|start|skip)=(\d+)/i,
    type: 'offset' as const,
  },
  // Simple numeric path: /1, /01, /123 (at end of URL, after a path separator)
  // This matches URLs like example.com/1 or example.com/products/01
  {
    regex: /\/(\d+)(\/?)(#.*)?(\?.*)?$/,
    type: 'simpleNumber' as const,
  },
];

/**
 * Path segments that precede numeric IDs which are NOT page numbers.
 * When the simpleNumber pattern matches and the path segment immediately
 * before the number is in this set, the match is discarded.
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
  'users',
  'order', // E-commerce orders
  'orders',
  'comment', // Comment IDs
  'comments',
  'message', // Message IDs
  'messages',
  'thread', // Thread IDs
  'threads',
  'attachment',
  'download',
  'file',
  'files',
  'itm', // eBay item IDs
  'item',
]);

export interface PaginationInfo {
  currentPage: number;
  pattern: (typeof PAGINATION_PATTERNS)[number];
  match: RegExpMatchArray;
}

/**
 * Detects pagination in a URL
 * @param url The URL to analyze
 * @returns Pagination info if found, null otherwise
 */
export function detectPagination(url: string): PaginationInfo | null {
  // We use the full URL for all patterns to correctly handle query parameters and hashes.
  // The simpleNumber regex is robust enough to handle the presence of hash and query.
  const computeCurrentPage = (
    pattern: (typeof PAGINATION_PATTERNS)[number],
    match: RegExpMatchArray
  ): number | null => {
    switch (pattern.type) {
      case 'query':
        return parseInt(match[3], 10);
      case 'path':
        return parseInt(match[2], 10);
      case 'offset':
        // For offset, we'll treat offset/10 as page number (assuming 10 items per page)
        return Math.floor(parseInt(match[3], 10) / 10) + 1;
      case 'simpleNumber':
        return parseInt(match[1], 10);
      default:
        return null;
    }
  };

  return (
    PAGINATION_PATTERNS.reduce<PaginationInfo | null>((found, pattern) => {
      if (found !== null) return found;
      const match = url.match(pattern.regex);
      if (!match) return null;
      // For simpleNumber, skip known non-pagination path segments
      if (pattern.type === 'simpleNumber' && match.index !== undefined) {
        const before = url.substring(0, match.index);
        const pathSegments = before.split('/').filter(Boolean);
        const immediateParent = pathSegments[pathSegments.length - 1] ?? '';
        const grandparent = pathSegments[pathSegments.length - 2] ?? '';
        // Check immediate parent and one level up — handles patterns like
        // /dp/product-slug/product-id where the blocklisted segment (dp) is 2 levels back
        if (
          SIMPLE_NUMBER_BLOCKLIST.has(immediateParent.toLowerCase()) ||
          SIMPLE_NUMBER_BLOCKLIST.has(grandparent.toLowerCase())
        ) {
          return null;
        }
        // Also skip if the immediate preceding segment is purely numeric (e.g. Discord /channels/123456/789012)
        if (/^\d+$/.test(immediateParent)) {
          return null;
        }
      }
      const currentPage = computeCurrentPage(pattern, match);
      if (currentPage === null || Number.isNaN(currentPage) || currentPage < 1)
        return null;
      return { currentPage, pattern, match };
    }, null) ?? null
  );
}

/**
 * Generates a new URL for a different page number
 * @param url Current URL
 * @param pagination Pagination info from detectPagination
 * @param newPage Target page number
 * @returns New URL with updated page number
 */
export function generatePageUrl(
  url: string,
  pagination: PaginationInfo,
  newPage: number
): string {
  const { pattern, match } = pagination;

  // Preserve leading zeros if present.
  // Each pattern stores the page number in a different capture group:
  //   query: match[3], path: match[2], offset: match[3], simpleNumber: match[1]
  const numberGroupIndex: Record<string, number> = {
    query: 3,
    path: 2,
    offset: 3,
    simpleNumber: 1,
  };
  const originalNumber = match[numberGroupIndex[pattern.type] ?? 1];
  const hasLeadingZeros =
    originalNumber !== undefined &&
    originalNumber.length > 1 &&
    originalNumber.startsWith('0');
  const formattedPage = hasLeadingZeros
    ? String(newPage).padStart(originalNumber.length, '0')
    : String(newPage);

  switch (pattern.type) {
    case 'query':
      // Replace query parameter value
      return url.replace(pattern.regex, `$1$2=${formattedPage}`);

    case 'path':
      // Replace path segment
      return url.replace(pattern.regex, `/${match[1]}/${formattedPage}$3`);

    case 'offset': {
      // Convert page back to offset (assuming 10 items per page)
      const newOffset = (newPage - 1) * 10;
      return url.replace(pattern.regex, `$1$2=${newOffset}`);
    }

    case 'simpleNumber': {
      // Replace the number in the path, preserving trailing slash, hash, and query
      const trailingSlash = match[2] || '';
      const hash = match[3] || '';
      const query = match[4] || '';
      return url.replace(
        pattern.regex,
        `/${formattedPage}${trailingSlash}${hash}${query}`
      );
    }

    default:
      return url;
  }
}

export interface PageNavigationInfo {
  detected: boolean;
  currentPage: number | null;
  canGoNext: boolean;
  canGoPrev: boolean;
  nextUrl: string | null;
  prevUrl: string | null;
  patternType:
    | 'link-rel'
    | 'dom'
    | 'query'
    | 'path'
    | 'offset'
    | 'simpleNumber'
    | null;
}

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
    nextUrl: nextLink ? nextLink.getAttribute('href') : null,
    prevUrl: prevLink ? prevLink.getAttribute('href') : null,
  };
}

/**
 * Detects pagination via DOM signals:
 * 1. <a rel="next"> / <a rel="prev"> anchor tags in the body
 * 2. An element with aria-label containing "pagination" or "page navigation",
 *    with inner anchors labelled next / prev
 */
function detectDomPagination(
  doc: Document
): { nextUrl: string | null; prevUrl: string | null } | null {
  // 1. Anchor rel attributes
  const nextAnchor = doc.querySelector(
    'a[rel="next"]'
  ) as HTMLAnchorElement | null;
  const prevAnchor = doc.querySelector(
    'a[rel="prev"], a[rel="previous"]'
  ) as HTMLAnchorElement | null;

  if (nextAnchor || prevAnchor) {
    return {
      nextUrl: nextAnchor ? nextAnchor.getAttribute('href') : null,
      prevUrl: prevAnchor ? prevAnchor.getAttribute('href') : null,
    };
  }

  // 2. ARIA pagination container: aria-label contains "paginat" or
  //    both "page" and "nav" (covers "Page navigation", "Pagination navigation")
  const paginationNav = Array.from(doc.querySelectorAll('[aria-label]')).find(
    (el) => {
      const label = (el.getAttribute('aria-label') ?? '').toLowerCase();
      return (
        label.includes('paginat') ||
        (label.includes('page') && label.includes('nav'))
      );
    }
  );

  if (paginationNav) {
    const nextLink = paginationNav.querySelector(
      'a[aria-label*="next" i]'
    ) as HTMLAnchorElement | null;
    const prevLink = paginationNav.querySelector(
      'a[aria-label*="prev" i]'
    ) as HTMLAnchorElement | null;

    if (nextLink || prevLink) {
      return {
        nextUrl: nextLink ? nextLink.getAttribute('href') : null,
        prevUrl: prevLink ? prevLink.getAttribute('href') : null,
      };
    }
  }

  return null;
}

/**
 * Primary entry point for pagination detection.
 *
 * When `doc` is provided (content script context), checks in order:
 *   1. <link rel="next"> / <link rel="prev"> in <head> — most reliable
 *   2. <a rel="next"> / <a rel="prev"> in body, or ARIA pagination nav
 *   3. URL pattern matching as final fallback
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

  if (doc) {
    // 1. <link rel> in <head> (most reliable)
    const linkRel = detectLinkRelPagination(doc);
    if (linkRel) {
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

    // 2. <a rel> in body or ARIA pagination nav
    const domPagination = detectDomPagination(doc);
    if (domPagination) {
      const urlPagination = detectPagination(url);
      return {
        detected: true,
        currentPage: urlPagination?.currentPage ?? null,
        canGoNext: domPagination.nextUrl !== null,
        canGoPrev: domPagination.prevUrl !== null,
        nextUrl: domPagination.nextUrl,
        prevUrl: domPagination.prevUrl,
        patternType: 'dom',
      };
    }
  }

  // 3. URL pattern fallback
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
    canGoNext: true, // unknown without DOM — best-effort assumption
    canGoPrev: pagination.currentPage > 1,
    nextUrl,
    prevUrl,
    patternType: pagination.pattern.type,
  };
}
