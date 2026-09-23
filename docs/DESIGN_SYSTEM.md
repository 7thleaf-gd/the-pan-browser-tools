# THE PAN Design System

The design system formalizes the existing Image Machine language: black equipment panels, off-white type, fluorescent green signal accents, hard borders, strong condensed typography, and intentionally square controls. It is not a generic rounded-card SaaS theme.

## CSS order

Load shared styles in this order:

```html
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/components.css">
```

Add one tool-specific stylesheet after them.

## Tokens

`assets/css/tokens.css` provides:

- Color: `--pan-color-black`, `--pan-color-screen`, panel colors, white, muted, green, line, error, and success.
- Spacing: `--pan-space-1` through `--pan-space-16`.
- Borders: `--pan-line` and strong line color.
- Typography: `--pan-font-sans`, meta/label/body sizes, bold/black weights, and tracking.
- Layers: noise, sticky controls, and dialog z-index tokens.
- Responsive reference values: `--pan-breakpoint-mobile` and `--pan-breakpoint-small`. CSS custom properties cannot drive media conditions, so media queries use the documented matching values `800px` and `520px`.
- Accessibility: shared focus outline, error, and success colors.

Legacy aliases (`--green`, `--panel`, and others) remain temporarily to protect Image Machine v0.

## Base

`base.css` owns box sizing, document defaults, typography inheritance, media sizing, selection, global `:focus-visible`, reduced motion, `.visually-hidden`, and `.skip-link`.

## Components

- `.masthead`, `.brand`, `.site-nav`: shared identity and three-item navigation.
- `.panel-label`: equipment-panel header.
- `.machine-button`: square, high-contrast action button; add `.accent` only to the primary action.
- `.control`: labelled native range input with numeric output.
- `.status-badge`: textual status; combine `●`/`○` with words so color is never the only signal.
- `.error-message`: assertive user-facing error region.
- `.busy-indicator`: polite processing status.
- `.tool-card`: available/planned tool summary.
- `footer`, `.footer-button`: common label and Privacy Settings entry.
- `.consent-panel`, `.consent-box`: modal consent UI above every sticky surface.

Tool-specific layout belongs outside shared components. Preserve hard edges, clear hierarchy, and restrained color.
