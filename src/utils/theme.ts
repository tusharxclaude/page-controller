/**
 * Centralized UI Theme for Turn The Page Extension
 *
 * 8-BIT RETRO GAMING THEME
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary accent - Neon Purple
  accent: {
    DEFAULT: 'violet-400',
    light: 'violet-300',
    dark: 'violet-600',
  },

  // Background colors - Deep retro darks
  bg: {
    primary: 'slate-950',
    secondary: 'slate-900',
    tertiary: 'slate-800',
  },

  // Text colors
  text: {
    primary: 'white',
    secondary: 'slate-300',
    muted: 'slate-500',
  },

  // Status colors - 8-bit standard
  status: {
    success: 'emerald-400',
    warning: 'yellow-400',
    error: 'red-500',
  },
} as const;

// ============================================================================
// UTILITY CLASSES
// ============================================================================

export const theme = {
  // Layout
  container:
    'bg-slate-950 text-slate-100 font-[Pixelify_Sans] antialiased tracking-wide',

  // Cards & Sections - 8-bit style: No border radius, thick borders
  card: 'border-2 border-slate-700 bg-slate-900 shadow-none',
  cardHeader: 'border-b-2 border-slate-700 px-5 py-4 flex items-center gap-3',
  cardTitle: 'text-sm font-bold text-violet-400 uppercase tracking-widest',
  cardBody: 'p-5',

  // Form Controls - Blocky
  input:
    'w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none placeholder-slate-600 font-[Pixelify_Sans]',
  select:
    'w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none font-[Pixelify_Sans] appearance-none cursor-pointer hover:bg-slate-900',

  // Buttons - Retro Pressable
  button: {
    primary:
      'border-2 border-violet-400 bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 uppercase tracking-wider hover:bg-violet-300 hover:border-violet-300 active:translate-y-1 active:shadow-none transition-none shadow-[4px_4px_0px_0px_rgba(167,139,250,0.3)]',
    secondary:
      'border-2 border-slate-600 bg-transparent px-4 py-2 text-sm font-bold text-slate-400 uppercase tracking-wider hover:text-white hover:border-white hover:bg-slate-800 active:translate-y-1 active:shadow-none transition-none shadow-[4px_4px_0px_0px_rgba(71,85,105,0.3)]',
    ghost:
      'text-xs uppercase font-bold text-slate-500 hover:text-violet-400 transition-colors',
    icon: 'flex items-center justify-center border-2 border-transparent hover:border-violet-400 hover:bg-slate-900 transition-none',
  },

  // Toggle/Switch - Retro Checkbox style instead of toggle
  toggle: {
    base: 'relative h-6 w-12 border-2 border-slate-600 bg-slate-950 cursor-pointer hover:border-slate-500',
    active: 'border-violet-400 bg-violet-400/20',
    inactive: 'bg-slate-950',
    knob: 'absolute top-0.5 left-0.5 h-4 w-4 bg-slate-600 transition-none',
    knobActive: 'bg-violet-400 translate-x-6',
  },

  // Typography
  text: {
    heading:
      'text-2xl font-bold text-white uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(139,92,246,0.5)]',
    subheading: 'text-xs text-violet-400 uppercase tracking-wider font-bold',
    label: 'text-sm font-bold text-slate-200 uppercase',
    caption: 'text-xs text-slate-500 font-medium',
    code: 'font-mono text-xs text-emerald-400 bg-slate-950 px-1 py-0.5 border border-slate-800',
  },

  // Status indicators
  status: {
    active: 'text-emerald-400',
    inactive: 'text-slate-500',
    dot: {
      base: 'h-3 w-3 border border-slate-950 shadow-[1px_1px_0_rgba(255,255,255,0.2)]',
      active: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
      inactive: 'bg-slate-700',
    },
  },

  // Accent styles
  accent: {
    text: 'text-violet-400',
    textLight: 'text-violet-300',
    bg: 'bg-violet-400',
    bgLight: 'bg-violet-400/10',
    bgMedium: 'bg-slate-900', // Changed for high contrast
    border: 'border-violet-400',
    ring: 'ring-violet-400',
    hover: 'hover:bg-slate-800',
  },

  // Notifications
  toast: {
    success:
      'fixed top-4 right-4 z-50 flex items-center gap-3 border-2 border-emerald-400 bg-slate-900 px-4 py-3 text-sm font-bold text-emerald-400 shadow-[4px_4px_0_0_rgba(52,211,153,0.4)]',
  },

  // Header
  header: {
    container: 'border-b-4 border-slate-800 bg-slate-950',
    inner: 'mx-auto max-w-2xl px-6 py-6',
    iconWrapper:
      'flex h-12 w-12 items-center justify-center border-2 border-violet-500 bg-violet-500/10 shadow-[2px_2px_0_0_rgba(139,92,246,1)]',
    icon: 'h-6 w-6 text-violet-400',
  },

  // Loading
  loading: {
    spinner:
      'h-8 w-8 animate-spin border-4 border-slate-800 border-t-violet-400 rounded-none',
  },

  // Modifier buttons
  modifier: {
    active:
      'border-2 border-violet-400 bg-violet-400 text-slate-950 shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] translate-y-[1px]',
    inactive:
      'border-2 border-slate-600 bg-slate-900 text-slate-400 hover:border-white hover:text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all',
  },

  // Pattern list items
  patternItem:
    'flex items-center justify-between border border-slate-800 bg-slate-900 px-4 py-2 hover:border-violet-500 hover:bg-violet-500/5 transition-colors',
} as const;

// ============================================================================
// COMPONENT HELPERS
// ============================================================================

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(' ');
}

export function getToggleClasses(isActive: boolean): {
  button: string;
  knob: string;
} {
  return {
    button: cn(
      theme.toggle.base,
      isActive ? theme.toggle.active : theme.toggle.inactive
    ),
    knob: cn(theme.toggle.knob, isActive && theme.toggle.knobActive),
  };
}

export function getStatusClasses(isActive: boolean): {
  text: string;
  dot: string;
} {
  return {
    text: isActive ? theme.status.active : theme.status.inactive,
    dot: cn(
      theme.status.dot.base,
      isActive ? theme.status.dot.active : theme.status.dot.inactive
    ),
  };
}

export function getModifierClasses(isActive: boolean): string {
  return cn(
    'px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
    isActive ? theme.modifier.active : theme.modifier.inactive
  );
}

// ============================================================================
// SHARED DATA
// ============================================================================

export const KEY_OPTIONS = [
  { value: 'ArrowLeft', label: '← LEFT' },
  { value: 'ArrowRight', label: '→ RIGHT' },
  { value: 'ArrowUp', label: '↑ UP' },
  { value: 'ArrowDown', label: '↓ DOWN' },
  { value: 'a', label: 'A' },
  { value: 'd', label: 'D' },
  { value: 'w', label: 'W' },
  { value: 's', label: 'S' },
  { value: 'j', label: 'J' },
  { value: 'k', label: 'K' },
  { value: '[', label: '[' },
  { value: ']', label: ']' },
  { value: 'PageUp', label: 'PG UP' },
  { value: 'PageDown', label: 'PG DN' },
] as const;

export const MODIFIER_LABELS: Record<string, string> = {
  ctrl: 'CTRL',
  alt: 'ALT',
  shift: 'SHIFT',
  meta: 'CMD',
};

export const SUPPORTED_PATTERNS = [
  { pattern: '?page=1', desc: 'Query' },
  { pattern: '/page/1', desc: 'Path' },
  { pattern: '/1/', desc: 'Direct' },
] as const;

export const APP_VERSION = '2.0.0';
