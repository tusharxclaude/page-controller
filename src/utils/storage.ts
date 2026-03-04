import Browser from 'webextension-polyfill';

export interface ExtensionSettings {
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

export const DEFAULT_SETTINGS: ExtensionSettings = {
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

/**
 * Get extension settings from storage
 */
export async function getSettings(): Promise<ExtensionSettings> {
  try {
    const result = await Browser.storage.sync.get('settings');
    if (result.settings) {
      return { ...DEFAULT_SETTINGS, ...result.settings };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save extension settings to storage
 */
export async function saveSettings(
  settings: Partial<ExtensionSettings>
): Promise<void> {
  try {
    const current = await getSettings();
    const newSettings = { ...current, ...settings };
    await Browser.storage.sync.set({ settings: newSettings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  try {
    await Browser.storage.sync.set({ settings: DEFAULT_SETTINGS });
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}

/**
 * Listen for settings changes
 */
export function onSettingsChange(
  callback: (settings: ExtensionSettings) => void
): () => void {
  const listener = (
    changes: Record<string, Browser.Storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName === 'sync' && changes.settings) {
      callback(changes.settings.newValue as ExtensionSettings);
    }
  };

  Browser.storage.onChanged.addListener(listener);

  return () => {
    Browser.storage.onChanged.removeListener(listener);
  };
}

/**
 * Format key combination for display
 */
export function formatKeyCombo(
  key: string,
  modifiers: ExtensionSettings['modifiers']
): string {
  const parts: string[] = [];

  if (modifiers.ctrl) parts.push('Ctrl');
  if (modifiers.alt) parts.push('Alt');
  if (modifiers.shift) parts.push('Shift');
  if (modifiers.meta) parts.push('⌘');

  // Format key name for display
  let displayKey = key;
  if (key === 'ArrowLeft') displayKey = '←';
  else if (key === 'ArrowRight') displayKey = '→';
  else if (key === 'ArrowUp') displayKey = '↑';
  else if (key === 'ArrowDown') displayKey = '↓';
  else if (key.length === 1) displayKey = key.toUpperCase();

  parts.push(displayKey);

  return parts.join(' + ');
}
