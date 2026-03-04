import { useCallback, useEffect } from 'react';
import { getPageNavigation } from '@utils/pageNavigation';
import {
  DEFAULT_SETTINGS,
  ExtensionSettings,
  getSettings,
} from '@utils/storage';

/**
 * Invisible content component that handles keyboard navigation
 * No UI is rendered - this just listens for keyboard events
 */
export default function Content(): null {
  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
    // Get current settings
    let settings: ExtensionSettings;
    try {
      settings = await getSettings();
    } catch {
      settings = DEFAULT_SETTINGS;
    }

    // Check if extension is enabled
    if (!settings.enabled) return;

    // Check if we're in an input field
    const target = event.target as HTMLElement;
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    if (isInputField) return;

    // Check modifiers
    const modifiersMatch =
      event.ctrlKey === settings.modifiers.ctrl &&
      event.altKey === settings.modifiers.alt &&
      event.shiftKey === settings.modifiers.shift &&
      event.metaKey === settings.modifiers.meta;

    if (!modifiersMatch) return;

    const currentUrl = window.location.href;
    const pageInfo = getPageNavigation(currentUrl, document);

    // Handle next page
    if (event.key === settings.nextKey && pageInfo.detected) {
      event.preventDefault();
      if (pageInfo.nextUrl) {
        window.location.href = pageInfo.nextUrl;
      }
      return;
    }

    // Handle previous page
    if (
      event.key === settings.prevKey &&
      pageInfo.detected &&
      pageInfo.canGoPrev
    ) {
      event.preventDefault();
      if (pageInfo.prevUrl) {
        window.location.href = pageInfo.prevUrl;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return null - no UI needed
  return null;
}
