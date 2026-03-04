/**
 * Content script for Turn The Page extension
 * Handles keyboard events for page navigation and shows visual indicator
 */

import { getPageNavigation } from '@utils/pageNavigation';

// Settings interface
interface ExtensionSettings {
  enabled: boolean;
  nextKey: string;
  prevKey: string;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  showNotifications: boolean;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  nextKey: 'ArrowRight',
  prevKey: 'ArrowLeft',
  modifiers: {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  },
  showNotifications: true,
};

// Store current settings
let currentSettings: ExtensionSettings = DEFAULT_SETTINGS;
let indicatorElement: HTMLElement | null = null;

// Get settings from storage
async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      chrome.storage.sync.get('settings', (result) => {
        if (chrome.runtime.lastError) {
          console.warn(
            'Turn The Page: Error loading settings',
            chrome.runtime.lastError
          );
          resolve(DEFAULT_SETTINGS);
          return;
        }
        resolve(
          result.settings
            ? { ...DEFAULT_SETTINGS, ...result.settings }
            : DEFAULT_SETTINGS
        );
      });
    } else {
      resolve(DEFAULT_SETTINGS);
    }
  });
}

// Initialize settings
async function initSettings(): Promise<void> {
  try {
    currentSettings = await getSettings();
  } catch (error) {
    console.error('Turn The Page: Failed to load settings', error);
    currentSettings = DEFAULT_SETTINGS;
  }
}

// Create/update the floating indicator
function createIndicator(): HTMLElement {
  // Remove existing indicator if any
  const existing = document.getElementById('next-please-indicator');
  if (existing) existing.remove();

  const indicator = document.createElement('div');
  indicator.id = 'next-please-indicator';

  // Create shadow root for style isolation
  const shadow = indicator.attachShadow({ mode: 'open' });

  const fontUrl =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('assets/fonts/Pixelify-Sans.ttf')
      : '';

  const style = document.createElement('style');
  style.textContent = `
    ${
      fontUrl
        ? `@font-face {
      font-family: 'Pixelify Sans';
      src: url('${fontUrl}') format('truetype');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }`
        : ''
    }

    .np-container {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 2147483647;
      font-family: 'Pixelify Sans', monospace;
      pointer-events: none;
    }

    .np-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #0f172a;
      border: 2px solid #8b5cf6;
      box-shadow: 4px 4px 0 0 rgba(139, 92, 246, 0.8);
      pointer-events: auto;
      cursor: default;
    }

    .np-badge:hover {
      border-color: #a78bfa;
    }

    .np-icon {
      width: 20px;
      height: 20px;
      color: #8b5cf6;
    }

    .np-text {
      color: #a78bfa;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .np-page {
      background: rgba(139, 92, 246, 0.1);
      padding: 2px 8px;
      border: 1px solid #8b5cf6;
      font-size: 12px;
      font-weight: 700;
      color: #a78bfa;
    }

    .np-keys {
      display: flex;
      gap: 4px;
      margin-left: 4px;
    }

    .np-key {
      background: #1e293b;
      padding: 2px 6px;
      border: 1px solid #334155;
      font-size: 11px;
      font-weight: 700;
      color: #a78bfa;
      font-family: monospace;
    }

    .np-disabled {
      background: #0f172a;
      border-color: #475569;
      box-shadow: 4px 4px 0 0 rgba(0, 0, 0, 0.5);
    }

    .np-hidden {
      display: none;
    }
  `;

  const container = document.createElement('div');
  container.className = 'np-container';
  container.innerHTML = `
    <div class="np-badge">
      <svg class="np-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span class="np-text">Turn The Page</span>
      <span class="np-page" id="np-page-num">1</span>
      <div class="np-keys">
        <span class="np-key" id="np-prev-key">←</span>
        <span class="np-key" id="np-next-key">→</span>
      </div>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);

  document.body.appendChild(indicator);
  indicatorElement = indicator;

  return indicator;
}

// Format key for display
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
  };
  return keyMap[key] || key.toUpperCase();
}

// Update indicator based on current page status
function updateIndicator(): void {
  const pageInfo = getPageNavigation(window.location.href, document);

  if (!pageInfo.detected || !currentSettings.enabled) {
    // Remove indicator if no pagination or disabled
    if (indicatorElement) {
      indicatorElement.remove();
      indicatorElement = null;
    }
    return;
  }

  // Create or get indicator
  if (!indicatorElement || !document.body.contains(indicatorElement)) {
    indicatorElement = createIndicator();
  }

  // Update the indicator content
  const shadow = indicatorElement.shadowRoot;
  if (shadow) {
    const pageNum = shadow.getElementById('np-page-num');
    const prevKey = shadow.getElementById('np-prev-key');
    const nextKey = shadow.getElementById('np-next-key');

    if (pageNum) {
      pageNum.textContent = `${pageInfo.currentPage}`;
    }
    if (prevKey) {
      let keyText = formatKey(currentSettings.prevKey);
      if (currentSettings.modifiers.ctrl) keyText = `Ctrl+${keyText}`;
      if (currentSettings.modifiers.alt) keyText = `Alt+${keyText}`;
      if (currentSettings.modifiers.shift) keyText = `Shift+${keyText}`;
      if (currentSettings.modifiers.meta) keyText = `⌘+${keyText}`;
      prevKey.textContent = keyText;
    }
    if (nextKey) {
      let keyText = formatKey(currentSettings.nextKey);
      if (currentSettings.modifiers.ctrl) keyText = `Ctrl+${keyText}`;
      if (currentSettings.modifiers.alt) keyText = `Alt+${keyText}`;
      if (currentSettings.modifiers.shift) keyText = `Shift+${keyText}`;
      if (currentSettings.modifiers.meta) keyText = `⌘+${keyText}`;
      nextKey.textContent = keyText;
    }
  }
}

// Listen for settings changes
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.settings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };
      updateIndicator();
    }
  });
}

// Show temporary notification
function showNotification(
  message: string,
  type: 'success' | 'info' | 'warning' = 'info'
): void {
  if (!currentSettings.showNotifications) return;

  // Remove existing notification
  const existing = document.getElementById('next-please-notification');
  if (existing) existing.remove();

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'next-please-notification';
  notification.textContent = message;

  // Styles
  const colors = {
    success: {
      color: '#34d399',
      border: '#34d399',
      shadow: 'rgba(52, 211, 153, 0.4)',
    },
    info: {
      color: '#a78bfa',
      border: '#8b5cf6',
      shadow: 'rgba(139, 92, 246, 0.4)',
    },
    warning: {
      color: '#facc15',
      border: '#facc15',
      shadow: 'rgba(250, 204, 21, 0.4)',
    },
  };

  const fontUrl =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('assets/fonts/Pixelify-Sans.ttf')
      : '';

  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '80px',
    left: '20px',
    padding: '10px 16px',
    background: '#0f172a',
    color: colors[type].color,
    border: `2px solid ${colors[type].border}`,
    boxShadow: `4px 4px 0 0 ${colors[type].shadow}`,
    fontFamily: fontUrl ? '"Pixelify Sans", monospace' : 'monospace',
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    zIndex: '2147483647',
  });

  document.body.appendChild(notification);

  // Remove after delay
  setTimeout(() => notification.remove(), 1500);
}

// Handle keyboard events
function handleKeyDown(event: KeyboardEvent): void {
  // Check if extension is enabled
  if (!currentSettings.enabled) return;

  // Check if we're in an input field
  const target = event.target as HTMLElement;
  const isInputField =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable;

  if (isInputField) return;

  // Check modifiers match settings
  const modifiersMatch =
    event.ctrlKey === currentSettings.modifiers.ctrl &&
    event.altKey === currentSettings.modifiers.alt &&
    event.shiftKey === currentSettings.modifiers.shift &&
    event.metaKey === currentSettings.modifiers.meta;

  if (!modifiersMatch) return;

  const currentUrl = window.location.href;
  const pageNav = getPageNavigation(currentUrl, document);

  // Handle next page
  if (event.key === currentSettings.nextKey) {
    if (!pageNav.detected || !pageNav.canGoNext || !pageNav.nextUrl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const nextPage =
      pageNav.currentPage !== null ? pageNav.currentPage + 1 : null;
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

    const prevPage =
      pageNav.currentPage !== null ? pageNav.currentPage - 1 : null;
    const label =
      prevPage !== null ? `Going to page ${prevPage}` : 'Previous page';
    showNotification(label, 'success');
    setTimeout(() => {
      window.location.href = pageNav.prevUrl!;
    }, 150);
  }
}

// Initialize
async function init(): Promise<void> {
  await initSettings();

  // Add keyboard listener with capture phase for higher priority
  document.addEventListener('keydown', handleKeyDown, { capture: true });

  // Show indicator after a brief delay to ensure page is loaded
  setTimeout(() => {
    updateIndicator();
  }, 500);

  // Update indicator on URL changes (for SPAs)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateIndicator();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Start
init();
