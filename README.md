# Turn The Page 🔄

A Chrome/Edge/Brave browser extension that lets you navigate paginated websites using keyboard shortcuts. Automatically detects pagination patterns in URLs and enables quick navigation between pages.

## ✨ Features

- **🎯 Smart Detection**: Automatically detects various pagination patterns in URLs
- **⌨️ Keyboard Navigation**: Use arrow keys or custom key bindings to navigate
- **⚙️ Fully Configurable**: Customize your navigation keys and modifier requirements
- **🔔 Visual Feedback**: Optional toast notifications when navigating
- **🌙 Beautiful Dark UI**: Modern, premium-looking popup and options page
- **🌐 Cross-Browser**: Works on Chrome, Edge, Brave, and other Chromium browsers

## 📦 Supported URL Patterns

Turn The Page automatically recognizes these common pagination patterns:

| Pattern Type     | Examples                               |
| ---------------- | -------------------------------------- |
| Query Parameters | `?page=2`, `?p=5`, `?paged=3`, `?pg=1` |
| Path Segments    | `/page/2`, `/pages/3`, `/p/5`          |
| Offset-based     | `?offset=20`, `?start=30`, `?skip=10`  |
| Trailing Numbers | `/articles/123`, `/post/456`           |

## 🚀 Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/tusharxclaude/page-controller.git
   cd page-controller
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start development server:

   ```bash
   pnpm dev
   ```

4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist_chrome` folder

### Production Build

```bash
pnpm build
```

The built extension will be in `dist_chrome/`.

## ⌨️ Default Keyboard Shortcuts

| Action            | Default Shortcut  |
| ----------------- | ----------------- |
| Next Page         | `→` (Right Arrow) |
| Previous Page     | `←` (Left Arrow)  |
| Alt Next (System) | `Alt + →`         |
| Alt Prev (System) | `Alt + ←`         |

You can customize these in the popup or options page.

## 🎨 Configuration

Click the extension icon to access the popup with quick settings:

- **Enable/Disable**: Toggle the extension on or off
- **Key Bindings**: Choose which keys trigger navigation
- **Modifier Keys**: Optionally require Ctrl, Alt, Shift, or Cmd
- **Notifications**: Toggle visual feedback

For more options, click "Options" to access the full settings page.

## 🧠 How It Works

Turn The Page uses a **3-tier detection strategy**, tried in priority order:

### Tier 1 — `<link rel>` in `<head>` (most reliable)

Many sites (WordPress, Ghost, paginated APIs) declare navigation hints directly in the HTML head:

```html
<link rel="next" href="/blog/page/3" /> <link rel="prev" href="/blog/page/1" />
```

When these are present, the extension uses them directly — no URL parsing needed.

### Tier 2 — DOM signals in the page body

If no `<link rel>` tags are found, the extension looks for:

- **Anchor rel attributes**: `<a rel="next">` / `<a rel="prev">` in the document body
- **ARIA pagination containers**: An element with `aria-label` containing `"paginat"` or both `"page"` and `"nav"`, with inner links labelled next/prev

### Tier 3 — URL pattern matching (fallback)

When no DOM signals exist, the URL itself is parsed against 4 patterns (tried in order of specificity):

| Priority | Pattern         | Regex Match                        | Example                       |
| -------- | --------------- | ---------------------------------- | ----------------------------- |
| 1        | Query parameter | `?page=`, `?p=`, `?paged=`, `?pg=` | `example.com/posts?page=2`    |
| 2        | Path segment    | `/page/N`, `/pages/N`              | `example.com/blog/page/3`     |
| 3        | Offset-based    | `?offset=`, `?start=`, `?skip=`    | `example.com/items?offset=20` |
| 4        | Trailing number | `/N` at end of URL                 | `example.com/articles/5`      |

### False-Positive Prevention

The trailing number pattern is intentionally broad, so a **blocklist** prevents misidentifying IDs as page numbers. Segments like `status`, `issues`, `pull`, `dp`, `user`, `channels`, `order`, `comment`, `thread`, `file`, `download` (and their parents) are excluded — covering common platforms like GitHub, Twitter, Amazon, Discord, and e-commerce sites.

Additionally, if the segment immediately preceding the number is itself numeric (e.g. Discord's `/channels/123456/789012`), the match is discarded.

### URL Generation

Once a page number is detected, `generatePageUrl()` increments or decrements it in place — preserving leading zeros (e.g. `/page/001` → `/page/002`), trailing slashes, query strings, and URL hash fragments.

---

## 🛠️ Development

### Tech Stack

- ⚡ **Vite** - Fast development and building
- 🔷 **TypeScript** - Type-safe code
- ⚛️ **React** - UI components
- 🎨 **Tailwind CSS + DaisyUI** - Styling
- 📦 **CRXJS** - Chrome extension bundling

### Project Structure

```
src/
├── background/     # Service worker for extension
├── content/        # Content scripts (keyboard listener)
├── popup/          # Extension popup UI
├── options/        # Options page UI
├── utils/
│   ├── pageNavigation.ts  # URL pattern detection
│   └── storage.ts         # Settings management
└── manifest.ts     # Extension manifest
```

### Scripts

| Command              | Description              |
| -------------------- | ------------------------ |
| `pnpm dev`           | Start development server |
| `pnpm build`         | Production build         |
| `pnpm dev:firefox`   | Development for Firefox  |
| `pnpm build:firefox` | Build for Firefox        |

## 📝 License

MIT License - feel free to use this in your own projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for efficient web browsing
