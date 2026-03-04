/* eslint-disable jsx-a11y/label-has-associated-control */
import { JSX, useEffect, useState, useCallback } from 'react';

import {
  ExtensionSettings,
  getSettings,
  saveSettings,
  resetSettings,
  formatKeyCombo,
  DEFAULT_SETTINGS,
} from '@utils/storage';
import {
  theme,
  cn,
  getToggleClasses,
  getStatusClasses,
  getModifierClasses,
  KEY_OPTIONS,
  MODIFIER_LABELS,
  SUPPORTED_PATTERNS,
  APP_VERSION,
} from '@utils/theme';

export default function Options(): JSX.Element {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [listeningFor, setListeningFor] = useState<'prev' | 'next' | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSettingChange = useCallback(
    async (key: keyof ExtensionSettings, value: unknown) => {
      if (!settings) return;

      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await saveSettings(newSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
      setTimeout(() => setSaved(false), 2000);
    },
    [settings]
  );

  const handleReset = useCallback(async () => {
    await resetSettings();
    setSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleKeyCapture = useCallback(
    async (event: KeyboardEvent) => {
      if (!listeningFor || !settings) return;

      event.preventDefault();
      event.stopPropagation();

      const {key} = event;

      if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;

      const settingKey = listeningFor === 'prev' ? 'prevKey' : 'nextKey';
      const newSettings = { ...settings, [settingKey]: key };
      setSettings(newSettings);
      await saveSettings(newSettings);
      setListeningFor(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [listeningFor, settings]
  );

  useEffect(() => {
    if (listeningFor) {
      window.addEventListener('keydown', handleKeyCapture);
      return () => window.removeEventListener('keydown', handleKeyCapture);
    }
    return undefined;
  }, [listeningFor, handleKeyCapture]);

  // Loading state
  if (!settings) {
    return (
      <div className={cn('flex min-h-screen items-center justify-center', theme.container)}>
        <div className="flex flex-col items-center gap-3">
          <div className={theme.loading.spinner} />
          <p className={theme.text.caption}>Loading...</p>
        </div>
      </div>
    );
  }

  const statusClasses = getStatusClasses(settings.enabled);

  return (
    <div className={cn('min-h-screen', theme.container)}>
      {/* Header */}
      <header className={theme.header.container}>
        <div className={theme.header.inner}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={theme.header.iconWrapper}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={theme.header.icon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div>
                <h1 className={theme.text.heading}>Turn The Page</h1>
                <p className={theme.text.subheading}>Keyboard navigation settings</p>
              </div>
            </div>
            
            {/* Status */}
            <div className={cn('flex items-center gap-2 text-sm', statusClasses.text)}>
              <span className={statusClasses.dot} />
              {settings.enabled ? 'Active' : 'Disabled'}
            </div>
          </div>
        </div>
      </header>

      {/* Save notification */}
      {saved && (
        <div className="fixed top-4 right-4 z-50">
          <div className={theme.toast.success}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </div>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        
        {/* General Settings */}
        <section className={theme.card}>
          <div className={theme.cardHeader}>
            <h2 className={theme.cardTitle}>General</h2>
          </div>
          
          <div className="divide-y divide-slate-800">
            {/* Enable Extension */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <label className={theme.text.label}>Enable Extension</label>
                <p className={cn('mt-0.5', theme.text.caption)}>Turn keyboard navigation on or off</p>
              </div>
              {(() => {
                const toggleClasses = getToggleClasses(settings.enabled);
                return (
                  <button
                    type="button"
                    role="switch"
                    aria-label="Enable Extension"
                    aria-checked={settings.enabled}
                    onClick={() => handleSettingChange('enabled', !settings.enabled)}
                    className={toggleClasses.button}
                  >
                    <span className={toggleClasses.knob} />
                  </button>
                );
              })()}
            </div>

            {/* Show Notifications */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <label className={theme.text.label}>Show Notifications</label>
                <p className={cn('mt-0.5', theme.text.caption)}>Display visual feedback when navigating</p>
              </div>
              {(() => {
                const toggleClasses = getToggleClasses(settings.showNotifications);
                return (
                  <button
                    type="button"
                    role="switch"
                    aria-label="Show Notifications"
                    aria-checked={settings.showNotifications}
                    onClick={() => handleSettingChange('showNotifications', !settings.showNotifications)}
                    className={toggleClasses.button}
                  >
                    <span className={toggleClasses.knob} />
                  </button>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className={theme.card}>
          <div className={theme.cardHeader}>
            <h2 className={theme.cardTitle}>Keyboard Shortcuts</h2>
          </div>

          <div className={cn(theme.cardBody, 'space-y-5')}>
            {/* Key bindings */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Previous */}
              <div className={cn('p-4', theme.accent.border, theme.accent.bgLight, 'border-2')}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('text-lg', theme.accent.textLight)}>←</span>
                  <label className={theme.text.label}>Previous Page</label>
                </div>
                <div className="space-y-2">
                  <select
                    className={theme.select}
                    value={settings.prevKey}
                    onChange={(e) => handleSettingChange('prevKey', e.target.value)}
                  >
                    {KEY_OPTIONS.map((key) => (
                      <option key={key.value} value={key.value}>{key.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setListeningFor(listeningFor === 'prev' ? null : 'prev')}
                    className={cn(
                      'w-full border-2 px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                      listeningFor === 'prev'
                        ? 'bg-violet-400 border-transparent text-slate-900'
                        : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    )}
                  >
                    {listeningFor === 'prev' ? 'Press any key...' : 'Custom key'}
                  </button>
                </div>
              </div>

              {/* Next */}
              <div className={cn('p-4', theme.accent.border, theme.accent.bgLight, 'border-2')}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('text-lg', theme.accent.textLight)}>→</span>
                  <label className={theme.text.label}>Next Page</label>
                </div>
                <div className="space-y-2">
                  <select
                    className={theme.select}
                    value={settings.nextKey}
                    onChange={(e) => handleSettingChange('nextKey', e.target.value)}
                  >
                    {KEY_OPTIONS.map((key) => (
                      <option key={key.value} value={key.value}>{key.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setListeningFor(listeningFor === 'next' ? null : 'next')}
                    className={cn(
                      'w-full border-2 px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                      listeningFor === 'next'
                        ? 'bg-violet-400 border-transparent text-slate-900'
                        : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    )}
                  >
                    {listeningFor === 'next' ? 'Press any key...' : 'Custom key'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modifier keys */}
            <div className="border-2 border-slate-700 bg-slate-800/50 p-4">
              <label className={cn(theme.text.label, 'block mb-1')}>Modifier Keys</label>
              <p className={cn(theme.text.caption, 'mb-3')}>Hold these when pressing navigation keys</p>
              <div className="flex flex-wrap gap-2">
                {(['ctrl', 'alt', 'shift', 'meta'] as const).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleModifierChange(mod, !settings.modifiers[mod])}
                    className={getModifierClasses(settings.modifiers[mod])}
                  >
                    {MODIFIER_LABELS[mod]}
                  </button>
                ))}
              </div>
            </div>

            {/* Shortcut preview */}
            <div className={cn('p-5 text-center', theme.accent.bgLight)}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Your Shortcuts</p>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className={cn('inline-block border-2 bg-slate-800 px-4 py-2', theme.accent.border)}>
                    <span className={cn('font-mono text-lg font-semibold', theme.accent.textLight)}>
                      {formatKeyCombo(settings.prevKey, settings.modifiers)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Previous</p>
                </div>
                <span className="text-slate-600">⟷</span>
                <div className="text-center">
                  <div className={cn('inline-block border-2 bg-slate-800 px-4 py-2', theme.accent.border)}>
                    <span className={cn('font-mono text-lg font-semibold', theme.accent.textLight)}>
                      {formatKeyCombo(settings.nextKey, settings.modifiers)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Next</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Patterns */}
        <section className={theme.card}>
          <div className={theme.cardHeader}>
            <h2 className={theme.cardTitle}>Supported URL Patterns</h2>
          </div>
          
          <div className={theme.cardBody}>
            <div className="space-y-2">
              {SUPPORTED_PATTERNS.map((item) => (
                <div key={item.pattern} className={theme.patternItem}>
                  <code className={theme.text.code}>{item.pattern}</code>
                  <span className={theme.text.caption}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={handleReset} className={theme.button.ghost}>
            Reset to defaults
          </button>
          <span className="text-sm text-slate-600">v{APP_VERSION}</span>
        </div>
      </main>
    </div>
  );
}
