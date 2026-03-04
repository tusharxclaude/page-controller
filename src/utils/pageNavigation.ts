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

/**
 * Navigate to the next page
 * @param url Current URL
 * @returns New URL for next page, or null if pagination not detected
 */
export function getNextPageUrl(url: string): string | null {
  const pagination = detectPagination(url);
  if (!pagination) return null;

  const nextPage = pagination.currentPage + 1;
  return generatePageUrl(url, pagination, nextPage);
}

/**
 * Navigate to the previous page
 * @param url Current URL
 * @returns New URL for previous page, or null if pagination not detected or already on page 1
 */
export function getPrevPageUrl(url: string): string | null {
  const pagination = detectPagination(url);
  if (!pagination) return null;

  // Don't go below page 1 (or 0 for simpleNumber since some sites use 0-indexed)
  const minPage = 1;
  if (pagination.currentPage <= minPage) return null;

  const prevPage = pagination.currentPage - 1;
  return generatePageUrl(url, pagination, prevPage);
}

/**
 * Get current page information
 * @param url Current URL
 * @returns Object with current page number and navigation availability
 */
export function getPageInfo(url: string): {
  detected: boolean;
  currentPage: number | null;
  canGoNext: boolean;
  canGoPrev: boolean;
  patternType: string | null;
} {
  const pagination = detectPagination(url);

  if (!pagination) {
    return {
      detected: false,
      currentPage: null,
      canGoNext: false,
      canGoPrev: false,
      patternType: null,
    };
  }

  const minPage = 1;

  return {
    detected: true,
    currentPage: pagination.currentPage,
    canGoNext: true,
    canGoPrev: pagination.currentPage > minPage,
    patternType: pagination.pattern.type,
  };
}
