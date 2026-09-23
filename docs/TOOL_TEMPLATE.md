# New Tool Template

## Recommended structure

```text
tools/
  tool-id/
    index.html
    tool.css
    tool.js
```

Keep the repository dependency-free: static HTML, CSS, and Vanilla JavaScript with no build step.

## Required page metadata

Every public page needs a unique title and description, canonical production URL, robots directive, theme color, Open Graph title/description/URL/type, Twitter summary card, and `WebApplication` or `WebSite` JSON-LD. Do not reference an OG image until the file exists.

## Shared assets

Load `tokens.css`, `base.css`, and `components.css` before tool CSS. Load standard deferred scripts through `window.ThePan`:

1. `analytics.js`
2. `consent.js`
3. `canvas-utils.js` when Canvas or export helpers are needed
4. `audio-utils.js` when waveform peak extraction or WAV encoding is needed
5. Tool-specific JavaScript

Consent Mode defaults and any stored analytics grant must run inline before the GTM container. Never add direct GA4 `gtag.js` or a GTM noscript iframe.

## Analytics

Configure a fixed lowercase tool ID and version with `ThePan.analytics.configure()`. Only events on the allowlist are accepted. Propose new event names in `docs/ANALYTICS.md` before implementation.

Never send files, image/audio/video data, filenames, free text, URLs containing user data, or personal information.

## Privacy and processing

Creative input must stay in the browser. A declined analytics choice must not disable or degrade the tool. State the local-processing promise beside the input and controls.

## Export

Use an explicit user action, predictable safe filename, correct MIME type, and timely Object URL cleanup. Report export errors in the UI.

## Accessibility

Use native controls, visible labels, keyboard operation, `focus-visible`, assertive errors, polite busy status, `aria-busy`, Escape-to-close dialogs, focus traps, focus restoration, reduced-motion support, and text or symbols in addition to status color.
