/* eslint-disable jsx-a11y/label-has-associated-control */
import { JSX, useCallback, useEffect, useState } from 'react';
import { getPageNavigation, PageNavigationInfo } from '@utils/pageNavigation';
import {
  ExtensionSettings,
  formatKeyCombo,
  getSettings,
  saveSettings,
} from '@utils/storage';
import {
  APP_VERSION,
  cn,
  getModifierClasses,
  getToggleClasses,
  KEY_OPTIONS,
  MODIFIER_LABELS,
  theme,
} from '@utils/theme';

export default function Popup(): JSX.Element {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [pageInfo, setPageInfo] = useState<PageNavigationInfo | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Load settings
    getSettings().then(setSettings);

    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const {url} = tabs[0];
        setCurrentUrl(url);
        const info = getPageNavigation(url);
        setPageInfo(info);
      }
    });
  }, []);

  const handleSettingChange = useCallback(
    async (key: keyof ExtensionSettings, value: unknown) => {
      if (!settings) return;

      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await saveSettings(newSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [settings]
  );

  const handleModifierChange = useCallback(
    async (modifier: keyof ExtensionSettings['modifiers'], value: boolean) => {
      if (!settings) return;

      const newModifiers = { ...settings.modifiers, [modifier]: value };
      const newSettings = { ...settings, modifiers: newModifiers };
      setSettings(newSettings);
      await saveSettings(newSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [settings]
  );

  const navigateTo = useCallback(
    (direction: 'next' | 'prev') => {
      if (!currentUrl || !pageInfo?.detected) return;

      setIsAnimating(true);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.runtime.sendMessage(
            {
              type: direction === 'next' ? 'navigateNext' : 'navigatePrev',
              url: currentUrl,
            },
            (response) => {
              if (response?.success && response?.url) {
                chrome.tabs.update(tabs[0].id!, { url: response.url });
                setTimeout(() => window.close(), 300);
              } else {
                setIsAnimating(false);
              }
            }
          );
        }
      });
    },
    [currentUrl, pageInfo]
  );

  // Loading state
  if (!settings) {
    return (
      <div
        className={cn(
          'flex h-64 w-[400px] items-center justify-center',
          theme.container
        )}
      >
        <div className='flex flex-col items-center gap-3'>
          <div className={theme.loading.spinner} />
          <p className={theme.text.caption}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-[400px] overflow-hidden', theme.container)}>
      {/* Header */}
      <div className={cn('px-5 py-4', theme.header.container)}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className={theme.header.iconWrapper}>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className={theme.header.icon}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </div>
            <div>
              <h1 className={theme.text.heading}>Turn The Page</h1>
              <p className={theme.text.subheading}>Keyboard page navigation</p>
            </div>
          </div>

          {/* Power Toggle */}
          {(() => {
            const toggleClasses = getToggleClasses(settings.enabled);
            return (
              <button
                type='button'
                onClick={() =>
                  handleSettingChange('enabled', !settings.enabled)
                }
                className={toggleClasses.button}
                aria-label={
                  settings.enabled ? 'Disable extension' : 'Enable extension'
                }
              >
                <span className={toggleClasses.knob} />
              </button>
            );
          })()}
        </div>
      </div>

      {/* Current Page Status */}
      <div className='border-b border-slate-800 px-5 py-4'>
        {pageInfo?.detected ? (
          <div
            className={cn(
              'p-4',
              theme.accent.bgLight,
              'border-2',
              theme.accent.border,
              isAnimating && 'scale-95 opacity-70'
            )}
          >
            <div className='mb-3 flex items-center justify-between'>
              <div>
                <p
                  className={cn('text-sm font-medium', theme.accent.textLight)}
                >
                  Pagination Detected
                </p>
                <p className='text-xs text-slate-500'>
                  Pattern: {pageInfo.patternType}
                </p>
              </div>
              <div className='text-right'>
                <p className={cn('text-2xl font-bold', theme.accent.textLight)}>
                  {pageInfo.currentPage}
                </p>
                <p className='text-xs text-slate-500'>Current Page</p>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className='flex gap-2'>
              <button
                type='button'
                disabled={!pageInfo.canGoPrev || isAnimating}
                onClick={() => navigateTo('prev')}
                className={cn(
                  'flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                  'border-2 border-slate-700 text-slate-400',
                  'hover:border-violet-400 hover:text-white',
                  'disabled:cursor-not-allowed disabled:opacity-30'
                )}
              >
                ← Previous
              </button>
              <button
                type='button'
                disabled={!pageInfo.canGoNext || isAnimating}
                onClick={() => navigateTo('next')}
                className={cn(
                  'flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                  theme.accent.bg,
                  'text-slate-900',
                  'hover:bg-violet-300',
                  'disabled:cursor-not-allowed disabled:opacity-30'
                )}
              >
                Next →
              </button>
            </div>
          </div>
        ) : (
          <div className='border-2 border-slate-700 bg-slate-800/30 p-4 text-center'>
            <p className='text-sm font-medium text-slate-400'>
              No Pagination Found
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              Navigate to a paginated page to use shortcuts
            </p>
            <div className='mt-3 flex flex-wrap justify-center gap-2 text-xs'>
              <code className={theme.text.code}>?page=2</code>
              <span className='text-slate-600'>•</span>
              <code className={theme.text.code}>/page/2</code>
              <span className='text-slate-600'>•</span>
              <code className={theme.text.code}>/2</code>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className='px-5 py-4'>
        <h2 className={cn(theme.cardTitle, 'mb-3')}>Keyboard Shortcuts</h2>

        <div className='grid grid-cols-2 gap-3'>
          {/* Previous Key */}
          <div>
            <label className='mb-1.5 block text-xs text-slate-500'>
              Previous Page
            </label>
            <select
              className={theme.select}
              value={settings.prevKey}
              onChange={(e) => handleSettingChange('prevKey', e.target.value)}
            >
              {KEY_OPTIONS.map((key) => (
                <option key={key.value} value={key.value}>
                  {key.label}
                </option>
              ))}
            </select>
          </div>

          {/* Next Key */}
          <div>
            <label className='mb-1.5 block text-xs text-slate-500'>
              Next Page
            </label>
            <select
              className={theme.select}
              value={settings.nextKey}
              onChange={(e) => handleSettingChange('nextKey', e.target.value)}
            >
              {KEY_OPTIONS.map((key) => (
                <option key={key.value} value={key.value}>
                  {key.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modifier Keys */}
        <div className='mt-3'>
          <label className='mb-2 block text-xs text-slate-500'>
            Modifier keys (optional)
          </label>
          <div className='flex flex-wrap gap-2'>
            {(['ctrl', 'alt', 'shift', 'meta'] as const).map((mod) => (
              <button
                key={mod}
                type='button'
                onClick={() =>
                  handleModifierChange(mod, !settings.modifiers[mod])
                }
                className={getModifierClasses(settings.modifiers[mod])}
              >
                {MODIFIER_LABELS[mod]}
              </button>
            ))}
          </div>
        </div>

        {/* Current Shortcut Display */}
        <div className={cn('mt-4 p-3 text-center', theme.accent.bgLight)}>
          <p className='mb-2 text-xs text-slate-500'>Your shortcuts</p>
          <div className='flex items-center justify-center gap-3'>
            <div
              className={cn(
                'border-2 bg-slate-800 px-3 py-1.5',
                theme.accent.border
              )}
            >
              <span
                className={cn(
                  'font-mono text-sm font-medium',
                  theme.accent.textLight
                )}
              >
                {formatKeyCombo(settings.prevKey, settings.modifiers)}
              </span>
            </div>
            <span className='text-slate-600'>/</span>
            <div
              className={cn(
                'border-2 bg-slate-800 px-3 py-1.5',
                theme.accent.border
              )}
            >
              <span
                className={cn(
                  'font-mono text-sm font-medium',
                  theme.accent.textLight
                )}
              >
                {formatKeyCombo(settings.nextKey, settings.modifiers)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='border-t border-slate-800 px-5 py-3'>
        <div className='flex items-center justify-between text-xs'>
          <span className='text-slate-600'>v{APP_VERSION}</span>
          {saved && (
            <span
              className={cn('flex items-center gap-1', theme.status.active)}
            >
              <svg
                className='h-3 w-3'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
              Saved
            </span>
          )}
          <button
            type='button'
            onClick={() => chrome.runtime.openOptionsPage()}
            className={cn(
              theme.accent.text,
              'transition-colors hover:text-violet-300'
            )}
          >
            More options →
          </button>
        </div>
      </div>
    </div>
  );
}
