import { getPageNavigation } from '@utils/pageNavigation';
import {
  DEFAULT_SETTINGS,
  ExtensionSettings,
  getSettings,
} from '@utils/storage';
import Browser from 'webextension-polyfill';

// Store current settings
let currentSettings: ExtensionSettings = DEFAULT_SETTINGS;

// Initialize settings
async function initSettings(): Promise<void> {
  currentSettings = await getSettings();
}

// Listen for settings changes
Browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.settings) {
    currentSettings = changes.settings.newValue as ExtensionSettings;
  }
});

// Type for messages
interface ExtensionMessage {
  type: string;
  url?: string;
}

// Message handler for content script requests
Browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as ExtensionMessage;

  if (msg.type === 'getPageInfo' && msg.url) {
    return Promise.resolve(getPageNavigation(msg.url));
  }

  if (msg.type === 'getSettings') {
    return Promise.resolve(currentSettings);
  }

  if (msg.type === 'navigateNext' && msg.url) {
    const nav = getPageNavigation(msg.url);
    if (nav.nextUrl) {
      return Promise.resolve({ success: true, url: nav.nextUrl });
    }
    return Promise.resolve({
      success: false,
      reason: 'No pagination detected',
    });
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

  return Promise.resolve(null);
});

// Handle Chrome commands (keyboard shortcuts set in manifest)
Browser.commands.onCommand.addListener(async (command: string) => {
  // Get the active tab
  const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.url || !activeTab.id) return;

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
});

// Initialize on install
Browser.runtime.onInstalled.addListener(async () => {
  await initSettings();
  console.log(
    'Turn The Page extension installed! Navigate pages with arrow keys.'
  );
});

// Initialize on startup
initSettings();
